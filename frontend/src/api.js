export const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001"
    : (process.env.REACT_APP_API_URL || "https://nearconnect-backend-cavd.onrender.com");


// =========================================================
// GET TOKEN
// =========================================================

export function getToken() {
  return localStorage.getItem(
    "nearconnect_token"
  );
}


// =========================================================
// GET SAVED USER
// =========================================================

export function getSavedUser() {

  const user = localStorage.getItem(
    "nearconnect_user"
  );

  if (!user) {
    return null;
  }

  try {

    return JSON.parse(user);

  } catch (error) {

    console.error(
      "Invalid saved user:",
      error
    );

    return null;
  }
}


// =========================================================
// SAVE USER
// =========================================================

export function saveUser(user) {

  if (!user) {
    return;
  }

  localStorage.setItem(
    "nearconnect_user",
    JSON.stringify(user)
  );
}


// =========================================================
// SAVE TOKEN
// =========================================================

export function saveToken(token) {

  if (!token) {
    return;
  }

  localStorage.setItem(
    "nearconnect_token",
    token
  );
}


// =========================================================
// CLEAR AUTH
// =========================================================

export function clearAuth() {

  localStorage.removeItem(
    "nearconnect_token"
  );

  localStorage.removeItem(
    "nearconnect_user"
  );
}


// =========================================================
// AUTHENTICATED FETCH
// =========================================================

export async function apiFetch(
  endpoint,
  options = {}
) {

  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };


  // Only add JSON content type when
  // there is a body.

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
  }


  // =======================================================
  // JWT
  // =======================================================

  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  // =======================================================
  // REQUEST
  // =======================================================

  let response;

  try {

    response = await fetch(
      `${API}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  } catch (error) {

    console.error(
      "API connection error:",
      error
    );

    throw new Error(
      "Unable to connect to NearConnect server."
    );
  }


  // =======================================================
  // RESPONSE
  // =======================================================

  let data = {};
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  } else {
    try {
      const text = await response.text();
      data = text && !text.includes("<!doctype") && !text.includes("<html")
        ? { message: text }
        : { message: `Request failed with status ${response.status}` };
    } catch {
      data = {};
    }
  }


  // =======================================================
  // AUTH ERROR
  // =======================================================

  if (
    response.status === 401
  ) {

    console.error(
      "Authentication failed:",
      data
    );

    clearAuth();

    throw new Error(
      "Your login session has expired. Please login again."
    );
  }


  // =======================================================
  // OTHER ERROR
  // =======================================================

  if (!response.ok) {
    const errMsg = data.error || data.message || data.msg;
    if (typeof errMsg === "string" && (errMsg.includes("<!doctype") || errMsg.includes("<html"))) {
      throw new Error(`Server endpoint returned ${response.status} error.`);
    }
    throw new Error(
      errMsg || "Something went wrong."
    );
  }


  // =======================================================
  // SUCCESS
  // =======================================================

  return data;
}


// =========================================================
// DEFAULT EXPORT
// =========================================================

export default API;