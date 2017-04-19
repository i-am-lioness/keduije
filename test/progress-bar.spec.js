/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import ProgressBar from '../react/components/progress-bar';

describe('<ProgressBar />', () => {
  const seekTo = sinon.spy();
  let wrap = null;
  describe('basic rendering', function () {
    before(function () {
      const display = (<ProgressBar onSeekTo={seekTo} percentage={0} />);

      wrap = shallow(display);
    });

    it('renders', () => {
      expect(wrap.instance()).to.be.instanceOf(ProgressBar);
    });

    it('initially has width of 0', () => {
      expect(wrap.find('.seeking-bar-meter').at(0).prop('style').width).to.equal('0%');
    });

    it('changes width with percentage', () => {
      wrap.setProps({ percentage: 0.49 });
      expect(wrap.find('.seeking-bar-meter').at(0).prop('style').width).to.equal('49%');
    });

    it('handles invalid percentage');
  });

  describe('interaction', function () {
    before(function () {
      if (process.env.NODE_ENV !== 'test') {
        this.skip();
      } else {
        const display = (<ProgressBar onSeekTo={seekTo} percentage={0} />);
        const container = document.getElementById('react');
        wrap = mount(display, { attachTo: container });
      }
    });

    it('jumps to respective point in media when clicked ', function () {
      const xOffset = document.body.offsetWidth * 0.4;
      wrap.find('.seeking-bar').at(0).simulate('click', { clientX: xOffset });
      expect(seekTo.calledOnce).to.be.true;
    });

    it('guide follows mouse during mouse over', function () {
      const xOffset = 500;
      wrap.find('.seeking').at(0).simulate('mouseMove', { clientX: xOffset });
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).to.equal(`${xOffset}px`);
    });

    it('guide clears when mouse leaves', function () {
      wrap.find('.seeking').at(0).simulate('mouseLeave');
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).to.equal('0px');
    });
  });

  describe('in browser: ', function () {
    before(function () {
      if (process.env.NODE_ENV === 'test') {
        this.skip();
      } else {
        const display = (<ProgressBar onSeekTo={seekTo} percentage={0} />);
        const container = document.getElementById('react');
        wrap = mount(display, { attachTo: container });
      }
    });

    it('initially has width of 0', function () {
      // for integration testing?
    });

    it('always has height of 10px', function () {
      /* needs to be tested with all css */
    });

    it('jumps to respective point in media when clicked ', function () {
      const xOffset = document.body.offsetWidth * 0.4;
      wrap.find('.seeking-bar').at(0).simulate('click', { clientX: xOffset });
      // debugger;
      expect(seekTo.calledOnce).to.be.true;
      expect(seekTo.lastCall.calledWith(0.4)).to.be.true;
    });

    it('guide follows mouse during mouse over', function () {
      const xOffset = 500;
      wrap.find('.seeking').at(0).simulate('mouseMove', { clientX: xOffset });
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).to.equal(`${xOffset}px`);
    });

    it('guide clears when mouse leaves', function () {
      wrap.find('.seeking').at(0).simulate('mouseLeave');
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).to.equal('0px');
    });
  });
});
