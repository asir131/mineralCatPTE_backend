const aboutUsModel = require("../../models/about_us.model");
const { asyncWrapper } = require("../../utils/AsyncWrapper");
const ExpressError = require("../../utils/ExpressError");

// module.exports.createAboutUs = asyncWrapper(async(req, res)=>{
//     const {aboutUsText} = req.body;

//     if(!aboutUsText){
//         throw new ExpressError(403, "aboutUsText is required");
//     }

//     const data = await aboutUsModel.create({aboutUsText});

//     res.status(200).json({message: 'success', aboutus: data});
// })


module.exports.getAboutUs = asyncWrapper(async(req, res)=>{
    const aboutUsText = await aboutUsModel.find();

    res.status(200).send(aboutUsText);
})


module.exports.updateAboutUs = asyncWrapper(async(req, res)=>{
    const {aboutUsText} = req.body;

    const data = await aboutUsModel.find();
    const dataId = data[0]._id;
    const updatedAboutUs = await aboutUsModel.findByIdAndUpdate(dataId, {aboutUsText}, {new: true});
    res.send(updatedAboutUs);
})