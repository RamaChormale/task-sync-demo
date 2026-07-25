const crypto = require("crypto");

const verifyGithubWebhook = (req, res, next) => {

    const signature = req.headers["x-hub-signature-256"];

    if (!signature) {
        return res.status(401).json({
            success: false,
            message: "Missing GitHub signature"
        });
    }


    const payload = JSON.stringify(req.body);


    const expectedSignature =
        "sha256=" +
        crypto
            .createHmac(
                "sha256",
                process.env.GITHUB_WEBHOOK_SECRET
            )
            .update(payload)
            .digest("hex");


    if (signature !== expectedSignature) {
        return res.status(401).json({
            success: false,
            message: "Invalid GitHub signature"
        });
    }


    next();
};


module.exports = verifyGithubWebhook;