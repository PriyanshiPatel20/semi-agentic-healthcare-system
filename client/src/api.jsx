import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3360/api",
});

// ── FRONTEND REQUEST LOGGER ──
API.interceptors.request.use(
    (config) => {
        const time = new Date().toLocaleTimeString();
        const method = (config.method || "GET").toUpperCase();
        console.log(`🌐 [FRONTEND API REQUEST] [${time}] ${method} ${config.url}`, {
            headers: {
                role: config.headers?.role,
                userid: config.headers?.userid,
                "Content-Type": config.headers?.["Content-Type"],
            },
            params: config.params,
            data: config.data instanceof FormData ? "(FormData)" : config.data,
        });
        return config;
    },
    (error) => {
        console.error("❌ [FRONTEND API REQUEST SETUP ERROR]:", error);
        return Promise.reject(error);
    }
);

// ── FRONTEND RESPONSE & ERROR LOGGER ──
API.interceptors.response.use(
    (response) => {
        const time = new Date().toLocaleTimeString();
        const method = (response.config?.method || "GET").toUpperCase();
        console.log(`✅ [FRONTEND API SUCCESS] [${time}] ${method} ${response.config?.url} (Status: ${response.status})`, response.data);
        return response;
    },
    (error) => {
        const time = new Date().toLocaleTimeString();
        const method = (error.config?.method || "UNKNOWN").toUpperCase();
        const url = error.config?.url || "unknown-url";
        const status = error.response?.status || "NO_RESPONSE";
        const serverError = error.response?.data?.error || error.response?.data?.detail || error.response?.data || error.message;

        console.error(`❌ [FRONTEND API ERROR] [${time}] ${method} ${url} (Status: ${status}):`, {
            errorMessage: error.message,
            serverErrorDetail: serverError,
            responseBody: error.response?.data,
            headers: error.config?.headers,
        });
        return Promise.reject(error);
    }
);

export default API;