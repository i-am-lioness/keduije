/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow, render } from 'enzyme';
import sinon from 'sinon';
import ProgressBar from '../react/components/progress-bar';

describe.only('<ProgressBar />', () => {
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

      wrap = mount(display);
    });

    it('plays the right lyric when clicked ', function () {
      wrap.find('.seeking-bar').at(0).simulate('click', { pageX: 50 });
      // expect(seekTo.calledWithExactly(34)).to.be.true;
      expect(seekTo.calledOnce).to.be.true;
    });

    it('moves guide when moused over');
  });
});
