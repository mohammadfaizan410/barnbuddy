const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const iv = crypto.randomBytes(16);
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const env = require("dotenv").config();

const {
  User,
  Customer,
  Business,
  Product,
  Review,
  BusinessClaim,
} = require("./model.js");
// ------- mongo db connection -------
mongoose.connect('mongodb://localhost:27017/barnbuddy');

const database = mongoose.connection;
database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected: " + database.name);
});

// const populateData = async (index) => {
//   if (index !== 162) {
//     try {
//       const data = fs.readFileSync("./finalList/" + index + "_final.json");
//       const jsonData = JSON.parse(data);
//       const businessData = jsonData.dispensary;
//       const products = jsonData.products;
//       let username =
//         businessData.name +
//         "-" +
//         businessData.country +
//         "-" +
//         businessData.locations[0].lat +
//         "-" +
//         businessData.locations[0].lon;
//       let email = businessData.email ? businessData.email : "temp@gmail.com";

//       // Create a user outside the loop
//       const user = new User({
//         username: username,
//         password: env.parsed.TEMP_PASSWORD,
//         email: email,
//         fullname: "NA",
//         date_of_birth: null,
//         user_type: "business",
//       });

//       // Save the user
//       await user.save();

//       const business = new Business({
//         user_id: user._id, // Ensure that user._id is assigned correctly
//         name: businessData.name,
//         address1: businessData.address1 ? businessData.address1 : "",
//         coverPhotoUrl: businessData.coverPhotoUrl
//           ? businessData.coverPhotoUrl
//           : "",
//         country: businessData.country ? businessData.country : "USA",
//         city: businessData.city ? businessData.city : "",
//         description: businessData.description
//           ? businessData.description
//           : "",
//         email: businessData.email ? businessData.email : "",
//         flags: businessData.flags ? businessData.flags : [],
//         locations: businessData.locations ? businessData.locations : [],
//         logoUrl: businessData.logoUrl ? businessData.logoUrl : "",
//         mapMarkerLocations: businessData.mapMarkerLocations
//           ? businessData.mapMarkerLocations
//           : [],
//         phone: businessData.phone ? businessData.phone : "",
//         photos: businessData.photos ? businessData.photos : [],
//         primaryLocation: businessData.primaryLocation
//           ? businessData.primaryLocation
//           : "",
//         state: businessData.state ? businessData.state : "",
//         tags: businessData.tags ? businessData.tags : [],
//         website: businessData.website ? businessData.website : "",
//         zip: businessData.zip ? businessData.zip : "",
//         products: [],
//         instore_purchasing: false,
//         claimed: false,
//         business_type: "greenstore",
//         deals: [],
//         reviews: [],
//         filters: [],
//         registration_date: Date.now(),
//         followers: [],
//         opening_hours: [],
//         isFeatured: false,
//         isTopRated: false,
//       });

//       // Save the business
//       await business.save();

//       for (let i = 0; i < products.length; i++) {
//         const product = new Product({
//           business_id: business._id, // Ensure that business._id is correctly assigned
//           name: products[i].name ? products[i].name : "",
//           brandName: products[i].brandName ? products[i].brandName : "",
//           cartUnit: products[i].cartUnit,
//           price: products[i].price ? products[i].price : 0,
//           description: products[i].description
//             ? products[i].description
//             : "",
//           productCategory: products[i].productCategory
//             ? products[i].productCategory
//             : "",
//           imageUrl: products[i].imageUrl ? products[i].imageUrl : "",
//           strainName: products[i].strainName
//             ? products[i].strainName
//             : "",
//           strainCategory: products[i].strainCategory
//             ? products[i].strainCategory
//             : "",
//           strainDescription: products[i].strainDescription
//             ? products[i].strainDescription
//             : "",
//           strainNucleusImageSvg: products[i].strainNucleusImageSvg
//             ? products[i].strainNucleusImageSvg
//             : "",
//           followers: [],
//           reviews: [],
//           isFeatured: false,
//         });

//         // Save the product
//         await product.save();
//         business.products.push(product._id);
//       }

//       // Save the business after adding products
//       await business.save();
//     } catch (error) {
//       console.log(error + " " + index);
//     }
//   }
// };


// for(let i =0 ; i < 229; i++){
//   if(i!==162){
//     populateData(i);
//   }

// }
// ------- mongo db connection --------

// ---------- MULTER SET UP ------------

// Set storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // Adjust file size limit as needed
});

// ----------- MULTER SET UP ------------

// --------- functions ------------

// Encryption
function encrypt(data, key) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encryptedText = cipher.update(data, "utf-8", "hex");

  encryptedText += cipher.final("hex");

  return encryptedText;
}

// Decryption
function decrypt(encryptedText, key) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decryptedText = decipher.update(encryptedText, "hex", "utf-8");

  decryptedText += decipher.final("utf-8");

  return decryptedText;
}

// Add a method to generate a token
function generateToken(data) {
  return jwt.sign(data, process.env.secret, {
    expiresIn: 604800 /* - 7 days */ /*86400* - one day */, // in seconds
  });
}


async function verifyToken(req, res, next) {
  const user_id = req.headers["authorization-user_id"];
  const incoming_token = req.headers["authorization-token"];

  if (!user_id || !incoming_token) {
    return res
      .status(401)
      .json({ message: "Token/id missing", success: false });
  }

  const user = await User.findOne({
    _id: user_id,
  });

  if (!user) {
    return res.status(401).json({ message: "User not found", success: false });
  }

  const token = user.token;


  if (token !== incoming_token) {
    console.log("Token/id mismatch");
    return res
      .status(401)
      .json({ message: "Token/id mismatch", success: false });
  }

  jwt.verify(incoming_token, process.env.secret, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Failed to authenticate token", success: false });
    }

    next();
  });
}

// --------- functions ------------

///////////////////////////////////////////////////////////
// _____  _    _ ____  _      _____ _____
// |  __ \| |  | |  _ \| |    |_   _/ ____|
// | |__) | |  | | |_) | |      | || |
// |  ___/| |  | |  _ <| |      | || |
// | |    | |__| | |_) | |____ _| || |____
// |_|     \____/|____/|______|_____\_____|
///////////////////////////////////////////////////////////

router.post("/auth/business", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email,
      password: password,
      user_type: "business",
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    }

    const business = await Business.findOne({
      user_id: user._id,
    });

    user.token = generateToken({ user_id: user._id });
    await user.save();

    return res
      .status(200)
      .json({ success: true, business: business, token: user.token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});


router.post("/business/getData", async (req, res) => {
  try {
    const { business_id } = req.body;
    
    const business = await Business.findOne({
      _id: business_id,
    });

    if (!business) {
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }

    return res.status(200).json({ business: business, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/customer/add", async (req, res) => {
  try {
    const { username, password, email, fullname, date_of_birth } = req.body;

    const existing_user = await User.findOne({
      email: email,
    });

    if (existing_user) {
      return res
        .status(400)
        .json({ message: "User already exists.", success: false });
    }
    const user = new User({
      username: username,
      password: password,
      email: email,
      fullname: fullname,
      date_of_birth: date_of_birth,
    });

    await user.save();

    const customer = new Customer({
      user_id: user._id,
      orders: [],
      purchase_history: [],
      billing_details: {},
      followed_businesses: [],
      followed_products: [],
      cart_items: [
        {
          product_id: "",
          quantity: 0,
        },
      ],
      user_type: "customer",
    });

    await customer.save();

    return res
      .status(200)
      .json({ message: "Success Customer Added.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/business/add", async (req, res) => {
  try {
    const {
      password,
      email,
      title,
      description,
      website_link,
      location,
      phone,
    } = req.body;

    const existing_user = await User.findOne({
      email: email,
    });

    if (existing_user) {
      return res
        .status(400)
        .json({ message: "User already exists.", success: false });
    }

    const user = new User({
      username: "NA",
      password: password,
      email: email,
      fullname: "NA",
      date_of_birth: null,
      user_type: "business",
    });

    await user.save();

    const banner_image =
      "https://img.freepik.com/free-vector/gradient-duotone-gaming-twitter-header_23-2149231677.jpg";
    const avatar =
      "https://www.dgpublishing.com/wp-content/uploads/cache/2018/02/temp-avatar/1922871591.jpg";

    const business = new Business({
      user_id: user._id,
      title: title,
      description: description,
      website_link: website_link,
      location: location,
      email: email,
      phone: phone,
      products: [],
      instore_purchasing: false,
      business_type: [],
      banner_image: banner_image,
      avatar: avatar,
      deals: [],
      reviews: "",
      filters: [],
      registration_date: Date.now(),
      followers: [],
      opening_hours: [],
      claimed: false,
    });

    await business.save();

    return res
      .status(200)
      .json({ message: "Success Business Added.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.post("/auth/verify", async (req, res) => {
  try {
    const { user_id, token } = req.body;

    const user = await User.findOne({
      _id: user_id,
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    }

    if (user.token !== token) {
      return res
        .status(400)
        .json({ message: "Token mismatch", success: false });
    }

    const business = await Business.findOne({
      user_id: user_id,
    });

    jwt.verify(token, process.env.secret, (err, decoded) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "Failed to authenticate token", success: false });
      }

      return res.status(200).json({ success: true, business: business });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});



router.post("/business/getAllProducts", async (req, res) => {
  try {
    const { business_id } = req.body;
    console.log(business_id);

    const business = await Business.findOne({
      _id : business_id,
    });

    if (!business) {
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }
    else{
      const products = await Product.find({
        business_id: business_id,
      });
      return res.status(200).json({ products: products, success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});


router.post("/business/getProductsByCategory", async (req, res) => {
  try {
    const { business_id, category } = req.body;
    const business = await Business.findOne({
      _id : business_id,
    });

    if (!business) {
      console.log("Business not found");
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }
    else{
      const products = await Product.find({
        business_id: business_id,
        productCategory: category,
      });
      return res.status(200).json({ products: products, success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.post("/business/reviews/getReviews", async (req, res) => {
  console.log("getReviews")
  try {
    const { type, id } = req.body;

    if (type === "business") {
      const business = await Business.findOne({
        _id: id,
      });

      if (!business) {
        return res
          .status(400)
          .json({ message: "Business not found", success: false });
      }

      const reviews = await Review.find({
        business_id: id,
      });
      if(reviews.length === 0){
        return res.status(200).json({ reviews: [], success: true });
      }
      return res.status(200).json({ reviews: reviews, success: true });
    } else if (type === "product") {
      const product = await Product.findOne({
        _id: id,
      });

      if (!product) {
        return res
          .status(400)
          .json({ message: "Product not found", success: false });
      }

      const reviews = await Review.find({
        product_id: id,
      });

      return res.status(200).json({ reviews: reviews, success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});


router.post("/products/getProduct", async (req, res) => {
  try {
    const { product_id } = req.body;

    const product
      = await Product.findOne({
        _id: product_id,
      });

    if (!product) {
      return res
        .status(400)
        .json({ message: {}, success: false });
    }

    return res.status(200).json({ product: product, success: true})
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});



/////////////////////////////////////////////////////////
// _____  _____  _______      __  _______ ______
// |  __ \|  __ \|_   _\ \    / /\|__   __|  ____|
// | |__) | |__) | | |  \ \  / /  \  | |  | |__
// |  ___/|  _  /  | |   \ \/ / /\ \ | |  |  __|
// | |    | | \ \ _| |_   \  / ____ \| |  | |____
// |_|    |_|  \_\_____|   \/_/    \_\_|  |______|
/////////////////////////////////////////////////////////

router.post("/user/customer/update", verifyToken, async (req, res) => {
  try {
    const { user_id, username, fullname, date_of_birth } = req.body;

    const user = await User.findOne({
      _id: user_id,
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", success: false });
    }

    user.username = username;
    user.fullname = fullname;
    user.date_of_birth = date_of_birth;

    await user.save();

    return res
      .status(200)
      .json({ message: "Success Customer Updated.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/business/:business_id", verifyToken, async (req, res) => {
  try {
    const { business_id } = req.params;

    const business = await Business.findOne({
      _id: business_id,
    });

    if (!business) {
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }

    return res.status(200).json({ business: business, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.get("/business/unclaimed/all", verifyToken, async (req, res) => {
  try {
    const businesses = await Business.find({
      claimed: false,
    });

    return res.status(200).json({ businesses: businesses, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.get("/business/all", async (req, res) => {
  try {
    const businesses = await Business.find({});

    return res.status(200).json({ businesses: businesses });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/business/update", verifyToken, async (req, res) => {
  try {
    const {
      user_id,
      email,
      title,
      description,
      website_link,
      location,
      phone,
    } = req.body;

    const user = User.findOne({
      _id: user_id,
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const banner_image = "";
    const avatar = "";

    const business = await Business.findOne({
      user_id: user_id,
    });

    business.title = title;
    business.description = description;
    business.website_link = website_link;
    business.location = location;
    business.email = email;
    business.phone = phone;
    business.banner_image = banner_image;
    business.avatar = avatar;

    await business.save();

    await user.save();
    return res.status(200).json({ message: "Success Business Updated." });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/business/claim",
  upload.fields([
    { name: "proof_of_ownership", maxCount: 1 },
    { name: "government_id", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { business_id, fullname, phone, dob, email } = req.body;

      const business_ownership_document =
        req.files["proof_of_ownership"][0].path;
      const government_issued_id = req.files["government_id"][0].path;
      console.log(
        business_id,
        fullname,
        phone,
        dob,
        email,
        business_ownership_document,
        government_issued_id
      )
      const business = await Business.findOne({
        _id: business_id,
      });

      if (!business) {
        return res
          .status(400)
          .json({ message: "Business not found", success: false });
      }

      const business_claim = new BusinessClaim({
        business_id: business_id,
        fullname: fullname,
        email: email,
        business_ownership_document: business_ownership_document,
        government_issued_id: government_issued_id,
        submission_date: Date.now(),
        status: "pending",
      });

      await business_claim.save();

      return res
        .status(200)
        .json({ message: "Success Business Claim Filed.", success: true });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
    }
  }
);

router.post("/business/claim/approve", verifyToken, async (req, res) => {
  try {
    const { business_claim_id } = req.body;

    const business_claim = await BusinessClaim.findOne({
      _id: business_claim_id,
    });

    if (!business_claim) {
      return res
        .status(400)
        .json({ message: "Business Claim not found", success: false });
    }

    business_claim.status = "rejected";
    await business_claim.save();

    return res
      .status(200)
      .json({ message: "Success Claim Rejected.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.post("/business/claim/reject", verifyToken, async (req, res) => {
  try {
    const { business_claim_id } = req.body;

    const business_claim = await BusinessClaim.findOne({
      _id: business_claim_id,
    });

    if (!business_claim) {
      return res
        .status(400)
        .json({ message: "Business Claim not found", success: false });
    }

    business_claim.status = "approved";
    await business_claim.save();

    const business = await Business.findOne({
      _id: business_claim.business_id,
    });

    business.claimed = true;
    await business.save();

    return res
      .status(200)
      .json({ message: "Success Claim Approved.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});




router.post(
  "/business/product/add",
  verifyToken,
  upload.fields([
    { name: "featured_image", maxCount: 1 },
    { name: "product_image_1", maxCount: 1 },
    { name: "product_image_2", maxCount: 1 },
    { name: "product_image_3", maxCount: 1 },
    { name: "product_image_4", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { business_id, title, description, categories, price } = req.body;

      const featured_image = req.files["featured_image"][0].path;
      const product_image_1 = req.files["product_image_1"][0].path;
      const product_image_2 = req.files["product_image_2"][0].path;
      const product_image_3 = req.files["product_image_3"][0].path;
      const product_image_4 = req.files["product_image_4"][0].path;

      const business = await Business.findOne({
        _id: business_id,
      });

      if (!business) {
        return res
          .status(400)
          .json({ message: "Business not found", success: false });
      }

      const product = new Product({
        business_id: business_id,
        title: title,
        description: description,
        categories: categories,
        price: price,
        followers: [],
        reviews: [],
        featured_image: featured_image,
        images: [
          product_image_1,
          product_image_2,
          product_image_3,
          product_image_4,
        ],
      });

      await product.save();

      business.products.push(product._id);
      await business.save();

      return res
        .status(200)
        .json({ message: "Success Product Added.", success: true });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
    }
  }
);

router.delete("/business/product/delete", verifyToken, async (req, res) => {
  try {
    const { business_id, product_id } = req.body;

    const business = await Business.findOne({
      _id: business_id,
    });

    if (!business) {
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }

    const product = await Product.findOne({
      _id: product_id,
    });

    if (!product) {
      return res
        .status(400)
        .json({ message: "Product not found", success: false });
    }

    business.products = business.products.filter((id) => id !== product_id);
    await business.save();

    await Product.deleteOne({
      _id: product_id,
    });

    return res
      .status(200)
      .json({ message: "Success Product Deleted.", success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.get("/business/:id/products", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const business = await Business.findOne({
      _id: id,
    });

    if (!business) {
      console.log("Business not found");
      return res
        .status(400)
        .json({ message: "Business not found", success: false });
    }

    const products = await Product.find({
      business_id: id,
    });

    return res.status(200).json({
      message: "Success! Products Found.",
      success: true,
      products: products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
});

router.post(
  "/business/product/update",
  verifyToken,
  upload.fields([{ name: "featured_image", maxCount: 1 }]),
  async (req, res) => {
    try {
      const {
        product_id,
        name,
        brandName,
        cartUnit,
        price,
        description,
        productCategory,
        strainName,
        strainCategory,
        strainDescription,
        isFeatured,
      } = req.body;

      const uploaded_image = req.files["featured_image"][0].path;

      const product = await Product.findOne({
        _id: product_id,
      });

      if (!product) {
        return res
          .status(400)
          .json({ message: "Product not found", success: false });
      }

      product.name = name;
      product.brandName = brandName;
      product.cartUnit = cartUnit;
      product.price = price;
      product.description = description;
      product.productCategory = productCategory;
      product.featured_image = uploaded_image;
      product.strainName = strainName;
      product.strainCategory = strainCategory;
      product.strainDescription = strainDescription;
      product.isFeatured = isFeatured;

      await product.save();

      return res
        .status(200)
        .json({ message: "Success Product Updated.", success: true });
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
    }
  }
);

module.exports = router;
