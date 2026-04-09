import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import fetch from "node-fetch";

const router = express.Router();

// =====================
// Middleware to protect routes
// =====================
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
  console.log("Authorization header:", req.headers.authorization);

  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    req.store = decoded; // { id }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// =====================
// Helpers
// =====================
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password.length >= 6;
const validateStoreName = (name) => name && name.length >= 2;

// Create tokens
const createTokens = (store) => {
  const accessToken = jwt.sign(
    { id: store.id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: store.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (token, storeId) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  await pool.query(
    "INSERT INTO refresh_tokens (token, store_id, expiry) VALUES ($1, $2, $3)",
    [token, storeId, expiry]
  );
};

// =====================
// REGISTER STORE
// =====================

// router.post("/register", async (req, res) => {
//   const { store_name, email, password, postcode } = req.body;

//   if (!store_name || !email || !password || !postcode) {
//     return res.status(400).json({ error: "All fields are required" });
//   }
//   if (!validateStoreName(store_name)) {
//     return res.status(400).json({ error: "Invalid store name" });
//   }
//   if (!validateEmail(email)) {
//     return res.status(400).json({ error: "Invalid email format" });
//   }
//   if (!validatePassword(password)) {
//     return res.status(400).json({ error: "Password must be at least 6 characters" });
//   }

//   try {
//     // Fetch lat/lng from postcode
//     const pcRes = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
//     const pcData = await pcRes.json();

//     if (pcData.status !== 200) {
//       return res.status(400).json({ error: "Invalid postcode" });
//     }

//     const { latitude, longitude } = pcData.result;
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const result = await pool.query(
//       `INSERT INTO stores (store_name, email, password_hash, postcode, latitude, longitude)
//        VALUES ($1, $2, $3, $4, $5, $6)
//        RETURNING id, store_name, email, postcode, latitude, longitude`,
//       [store_name, email, hashedPassword, postcode, latitude, longitude]
//     );

//     const store = result.rows[0];
//     const { accessToken, refreshToken } = createTokens(store);
//     await storeRefreshToken(refreshToken, store.id);

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: false, // true in production (HTTPS)
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.json({ accessToken, store });
//   } catch (err) {
//     console.error(err);
//     if (err.code === "23505") {
//       res.status(400).json({ error: "Email already registered" });
//     } else {
//       res.status(500).json({ error: err.message });
//     }
//   }
// });

router.post("/register", async (req, res) => {
  const { name, email, password, postcode, role } = req.body;

  if (!name || !email || !password || !postcode || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  if (!["business-owner", "consumer"].includes(role)) {
    return res.status(400).json({ error: "Invalid role type" });
  }

  try {
    // Fetch lat/lng from postcode
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
    const pcData = await pcRes.json();

    if (pcData.status !== 200) {
      return res.status(400).json({ error: "Invalid postcode" });
    }

    const { latitude, longitude } = pcData.result;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, postcode, latitude, longitude, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, postcode, latitude, longitude, role`,
      [name, email, hashedPassword, postcode, latitude, longitude, role]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = createTokens(user);
    await storeRefreshToken(refreshToken, user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // true in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, user });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      res.status(400).json({ error: "Email already registered" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// =====================
// LOGIN STORE
// =====================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: "User not found" });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    const { accessToken, refreshToken } = createTokens(user);
    await storeRefreshToken(refreshToken, user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        postcode: user.postcode,
        latitude: user.latitude,
        longitude: user.longitude,
        role:user.role
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =====================
// TEST ROUTE
// =====================
router.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "Authorized ✅", store: req.store });
});

export default router;