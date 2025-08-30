const FAQ = require("../../models/faqs.model");

module.exports.get5Faq = async (req, res) => {
    try {
        const faqs = await FAQ.find({}).limit(5).sort({ createdAt: -1 });

        if (!faqs || faqs.length === 0) {
            return res.status(404).json({ message: "No FAQs found" });
        }

        return res.status(200).json(faqs);
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.createFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: "Question and answer are required" });
        }

        const newFAQ = await FAQ.create({ question, answer });

        return res.status(201).json(newFAQ);
    } catch (error) {
        console.error("Error creating FAQ:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.updateFAQ = async (req, res) => {
    try {
        const {FAQId ,question, answer } = req.body;

        if (!question || !answer || !FAQId) {
            return res.status(400).json({ message: "Question and answer are required" });
        }

        const updatedFAQ = await FAQ.findByIdAndUpdate(FAQId, { question, answer }, { new: true });

        if (!updatedFAQ) {
            return res.status(404).json({ message: "FAQ not found" });
        }

        return res.status(200).json(updatedFAQ);
    } catch (error) {
        console.error("Error updating FAQ:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


module.exports.getAllFaqs = async (req, res) => {
    try {
        const faqs = await FAQ.find({}).sort({ createdAt: -1 });

        if (!faqs || faqs.length === 0) {
            return res.status(404).json({ message: "No FAQs found" });
        }

        return res.status(200).json(faqs);
    } catch (error) {
        console.error("Error fetching FAQs:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
