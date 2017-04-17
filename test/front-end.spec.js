/* eslint-env mocha, browser */
import React from 'react';
import { expect, assert } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';

describe('The front end', () => {
  it('shows login button, when not logged in');

  it('allows user to login on via fb');

  it('shows avatar, when logged in');

  it('user can log out when logged in');

  it('buttons do not maintain hover state when touched');

  // https://github.com/nnennaude/keduije/commit/8560a881e364160177cf30ccdc7d8fb0a3ae8a8a
  it('can scroll up on touch screen without triggering click event');

  it('never shows footer until scroll');
});
