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
      const display = (<ProgressBar onSeekTo={seekTo} percentage={0} />);
      const div = document.createElement('DIV');
      document.body.appendChild(div);
      div.style.width = '670px';
      div.style.height = '50px';
      wrap = mount(display, { attachTo: div });
    });

    it('plays the right lyric when clicked ', function () {
      wrap.find('.seeking-bar').at(0).simulate('click', { clientX: 50 });
      expect(seekTo.calledOnce).to.be.true;
    });

    it('guide follows mouse during mouse over', function () {
      wrap.find('.seeking').at(0).simulate('mouseMove', { clientX: 50 });
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).not.to.equal('0%');
    });

    it('guide clears when mouse leaves', function () {
      wrap.find('.seeking').at(0).simulate('mouseLeave');
      expect(wrap.find('.seeking-bar-guide').get(0).style.width).to.equal('0px');
    });
  });
});
