
var nodemailer = require('nodemailer');


var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_ADDRESS,
            pass: process.env.EMAIL_PASSWORD,
        }
    });

var mailOptions = {
    from: process.env.EMAIL_ADDRESS, // sender address
    to: process.env.EMAIL_ADDRESS, // list of receivers
    subject: 'Web activity', // Subject line
    text: "someone accessed" //, // plaintext body
    // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
};

  function send(text, subject){

  mailOptions.text=text;
  mailOptions.subject = subject || mailOptions.subject;

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
    }else{
        console.log('Message sent: ' + info.response);
    };
});
  }

module.exports = {
    send: send
  };
