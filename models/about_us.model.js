const { Schema, model } = require('mongoose');


const aboutUsSchema = new Schema({
    aboutUsText: {
        type: String,
        required: true,
    },
},
{
    timestamps: true,
}
)


const aboutUsModel = new model("abousUsModel", aboutUsSchema);

module.exports = aboutUsModel;