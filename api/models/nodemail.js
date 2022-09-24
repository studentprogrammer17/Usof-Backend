const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
      user: 'backendusofcampus@gmail.com',
      pass: 'bfujiwxcivkmdkpp'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const nodemail = (message) => {
  transporter.sendMail(message, (err, info) => {
    if (err) console.log(err)
    console.log('Email sent: ', info)
  })
}

module.exports = nodemail


