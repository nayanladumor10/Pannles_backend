const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        const query = {};

        // ** FIX: Make role filter case-insensitive **
        if (role) {
            query.role = new RegExp(`^${role}$`, 'i');
        }
        if (status) {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone: new RegExp(search, 'i') }
            ];
        }
        const users = await User.find(query);
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ** FIX: Removed updateUserDirect and suspendUserDirect as logic is now in user.routes.js **