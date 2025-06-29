exports.isAdmin = (req, res, next) => {
    req.user = { role: 'Admin' }; // mock for dev
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied' });
    }
};