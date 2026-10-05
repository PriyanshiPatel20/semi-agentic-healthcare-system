export const checkRole = (roles) => {
  return (req, res, next) => {
    const userRole = (req.headers.role || "").toLowerCase();

    if (!roles.map(r => r.toLowerCase()).includes(userRole)) {
      console.warn(`[Role Middleware] Access DENIED for path "${req.originalUrl}". User role "${userRole || "none"}" is not in allowed roles: [${roles.join(", ")}]`);
      return res.status(403).json({
        error: "Access denied",
        detail: `Role "${userRole || "none"}" is not authorized for this endpoint. Required roles: [${roles.join(", ")}]`,
      });
    }

    console.log(`🛡️ [Role Middleware] Access GRANTED for path "${req.originalUrl}" with role "${userRole}"`);
    next();
  };
};