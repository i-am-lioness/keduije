const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.EMAIL_ADDRESS,
  to: process.env.EMAIL_ADDRESS,
  subject: 'Web activity',
  text: 'someone accessed',
  // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
};

function send(text, subject) {
  mailOptions.text = text;
  mailOptions.subject = subject || mailOptions.subject;
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Message sent: ${info.response}`);
    }
  });
}

module.exports = {
  send: send,
};
