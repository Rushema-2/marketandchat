const express = require("express");
const router = express.Router();

const Contact = require("../models/Contact");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");


// ADD CONTACT
router.post("/add", authMiddleware, async (req, res) => {

    try {

        const { contactId } = req.body;

        if (!contactId) {
            return res.status(400).json({
                message: "Contact id required"
            });
        }


        if (String(req.user.userId) === String(contactId)) {
            return res.status(400).json({
                message: "Cannot add yourself"
            });
        }


        const exists = await Contact.findOne({
            owner: req.user.userId,
            contact: contactId
        });


        if (exists) {
            return res.status(400).json({
                message: "Already in contacts"
            });
        }


        const contact = await Contact.create({
            owner: req.user.userId,
            contact: contactId
        });


        res.json(contact);


    } catch(error) {

        res.status(500).json({
            message:error.message
        });

    }

});


// GET CONTACTS
router.get("/", authMiddleware, async (req,res)=>{

    try {

        const contacts = await Contact.find({
            owner:req.user.userId
        })
        .populate(
            "contact",
            "firstName lastName email phone"
        );


        res.json(contacts);


    } catch(error){

        res.status(500).json({
            message:error.message
        });

    }

});


module.exports = router;
