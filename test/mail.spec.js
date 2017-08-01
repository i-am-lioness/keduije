/* eslint-env mocha */
import sinon from 'sinon';
import { expect } from 'chai';
import mail from '../lib/mail';

const transporter = {
  sendMail: sinon.stub(),
};

const nodemailer = {
  createTransport: sinon.stub(),
};
nodemailer.createTransport.returns(transporter);


describe('mail.js', function () {
  const user = 'email';
  const pass = 'password';

  const text = 'text';
  const subject = 'subject';

  let log;
  let consoleError;
  let mailer;

  before(function () {
    mail.__Rewire__('nodemailer', nodemailer);
    mailer = mail(user, pass);
    log = sinon.spy(console, 'log');
    consoleError = sinon.spy(console, 'error');
  });

  beforeEach(function () {
    transporter.sendMail.yields(null, { response: '' });
  });

  afterEach(function () {
    transporter.sendMail.resetHistory();
    log.reset();
    consoleError.reset();
  });

  after(function () {
    mail.__ResetDependency__('nodemailer');
    nodemailer.createTransport.resetHistory();
    log.restore();
    consoleError.restore();
  });

  // ✓ GOOD
  it('initializes', function () {
    expect(nodemailer.createTransport.called).to.be.true;
    const initObj = nodemailer.createTransport.lastCall.args[0];
    expect(initObj).to.deep.equal({
      service: 'Gmail',
      auth: {
        user,
        pass,
      },
    });
  });

  // ✓ GOOD
  it('sends mail with subject', function () {
    mailer.send(text, subject);
    expect(transporter.sendMail.called).to.be.true;

    const mailOpts = transporter.sendMail.lastCall.args[0];
    expect(mailOpts).to.deep.equal({
      from: user,
      to: user,
      subject,
      text,
    });
    expect(log.lastCall.args[0]).to.include('Message sent');
  });

  // ✓ GOOD
  it('sends mail without subject', function () {
    mailer.send(text);
    expect(transporter.sendMail.called).to.be.true;

    const mailOpts = transporter.sendMail.lastCall.args[0];
    expect(mailOpts).to.deep.equal({
      from: user,
      to: user,
      subject: 'Web activity',
      text,
    });
  });

  // ✓ GOOD
  it('handles mail sending error', function () {
    transporter.sendMail.yields(new Error(), { response: '' });

    mailer.send(text, subject);
    expect(transporter.sendMail.called).to.be.true;
    expect(consoleError.lastCall.args[0]).to.be.an.instanceOf(Error);
  });
});
