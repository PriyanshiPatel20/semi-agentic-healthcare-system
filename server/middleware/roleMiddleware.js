export const checkRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.headers.role;

    console.log("User role:", userRole); 
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};