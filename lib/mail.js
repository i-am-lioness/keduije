const nodemailer = require('nodemailer');

let transporter;
let emailAddress;

function send(text, subject) {
  const mailOptions = {
    from: emailAddress,
    to: emailAddress,
    subject: 'Web activity',
    text: 'someone accessed',
    // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
  };

  mailOptions.text = text;
  mailOptions.subject = subject || mailOptions.subject;
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log(`Message sent: ${info.response}`);
    }
  });
}

function init(_emailAddress, _emailPassword) {
  emailAddress = _emailAddress;
  transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: emailAddress,
      pass: _emailPassword,
    },
  });
}

module.exports = {
  init,
  send,
};
