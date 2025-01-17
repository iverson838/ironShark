'use strict';

const { Router } = require('express');

const bcryptjs = require('bcryptjs');
const User = require('./../models/user');
const nodemailer = require('nodemailer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = new Router();

router.post('/sign-up', (req, res, next) => {
  const { name, email, password, picture } = req.body;
  console.log(name, email, password, picture);
  bcryptjs
    .hash(password, 10)
    .then((hash) => {
      return User.create({
        name,
        email,
        passwordHashAndSalt: hash,
        picture
      });
    })
    .then(
      stripe.customers.create({
        name,
        email
      })
    )
    .then((user) => {
      let transport = nodemailer.createTransport({
        host: process.env.OUTLOOK_SMTP,
        port: 587,
        auth: {
          user: process.env.OUTLOOK_EMAIL,
          pass: process.env.OUTLOOK_PASS
        }
      });

      req.session.userId = user._id;
      // send mail with defined transport object
      let mailOptions = {
        from: '"IronShark 🦈" <tremaine.ferry@ethereal.email>',
        to: `${user.email}`,
        subject: 'Welcome to IronShark',
        text: `Hello ${user.name}, \n\nWe're delighted to inform you that your account has been successfully created.\n\n\n You now can start browsing our games selection by clicking on the link below:\n http://www.iron-shark.netlify.com`
      };

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
      });
      res.json({ user });
    })

    .catch((error) => {
      next(error);
    });
});

router.post('/sign-in', (req, res, next) => {
  let user;
  const { email, password } = req.body;
  User.findOne({ email })
    .then((document) => {
      if (!document) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        user = document;
        return bcryptjs.compare(password, user.passwordHashAndSalt);
      }
    })
    .then((result) => {
      if (result) {
        req.session.userId = user._id;
        res.json({ user });
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch((error) => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.json({});
});

router.get('/me', (req, res, next) => {
  res.json({ user: req.user });
});

module.exports = router;
