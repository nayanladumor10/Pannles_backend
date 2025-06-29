const express = require('express');
const userController = require('../controllers/user.controller');
const { isAdmin } = require('../middlewares/auth.middleware');
const User = require('../models/User');
const Driver = require('../models/TRdriverModel'); // Import Driver model

module.exports = function(io) {
    const router = express.Router();

    // These routes now use the updated controller logic
    router.get('/', isAdmin, userController.getAllUsers);
    router.get('/:id', isAdmin, userController.getUserById);

    // This route now creates a user in the correct collection based on role
    router.post('/', isAdmin, async (req, res) => {
        try {
            const { role, email } = req.body;
            let newUser;
            let savedUser;

            if (role === 'Driver') {
                const existingDriver = await Driver.findOne({ email });
                if (existingDriver) {
                    return res.status(409).json({ message: 'Driver with this email already exists.' });
                }
                newUser = new Driver({ ...req.body });
                savedUser = await newUser.save();
            } else {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(409).json({ message: 'User with this email already exists.' });
                }
                newUser = new User({ ...req.body });
                savedUser = await newUser.save();
            }
            
            io.emit('user-created', savedUser);
            res.status(201).json(savedUser);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // This route now updates the correct user/driver document
    router.put('/:id', isAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body, lastUpdate: new Date() };
            let updatedUser;

            // Determine which model to update based on the role in the request body
            if (req.body.role === 'Driver') {
                updatedUser = await Driver.findByIdAndUpdate(id, updateData, { new: true });
            } else {
                updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
            }

            // Fallback for cases where role might not be in the body
            if (!updatedUser) {
                 updatedUser = await (await Driver.findById(id)) ? 
                    await Driver.findByIdAndUpdate(id, updateData, { new: true }) :
                    await User.findByIdAndUpdate(id, updateData, { new: true });
            }

            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }
            
            io.emit('user-updated', updatedUser);
            res.json(updatedUser);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // This route can now suspend a user from either collection
    router.patch('/:id/suspend', isAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            let user = await Driver.findById(id) || await User.findById(id);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            user.status = user.status === 'Suspended' ? 'Active' : 'Suspended';
            user.lastUpdate = new Date();
            const updatedUser = await user.save();
            
            io.emit('user-updated', updatedUser);
            res.json(updatedUser);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};