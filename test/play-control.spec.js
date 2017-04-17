/* eslint-env mocha */
import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import PlayControl from '../react/components/play-control';

const handleClick = sinon.spy();
const event = { currentTarget: null };
describe('<PlayControl />', () => {
  it('shows play image when paused (not playing) ', function () {
    const control = shallow(
      <PlayControl isPlaying togglePlayState={handleClick} />
    ).find('span');

    expect(control.hasClass('glyphicon-pause')).to.equal(true);
    expect(control.hasClass('glyphicon-play')).to.equal(false);
  });

  it('shows pause image when playing', function () {
    const control = shallow(
      <PlayControl isPlaying={false} togglePlayState={handleClick} />
    ).find('span');

    expect(control.hasClass('glyphicon-pause')).to.equal(false);
    expect(control.hasClass('glyphicon-play')).to.equal(true);
  });

  describe('interactivity: ', function () {
    let wrap = null;
    let isPlaying = false;
    const toggle = () => {
      isPlaying = !isPlaying;
      wrap.setProps({ isPlaying });
    };
    const togglePlayState = sinon.stub();
    let button = null;

    before(function () {
      wrap = shallow(<PlayControl isPlaying={isPlaying} togglePlayState={togglePlayState} />);
      button = wrap.find('div').at(0);
    });

    it('handles click event', function () {
      button.simulate('click', event);
      expect(togglePlayState.calledOnce).to.be.true;
    });

    it('toggles graphic on click', function () {
      expect(wrap.find('.glyphicon-pause')).to.have.lengthOf(0);
      expect(wrap.find('.glyphicon-play')).to.have.lengthOf(1);
      togglePlayState.callsFake(toggle);
      button.simulate('click', event);
      expect(wrap.find('.glyphicon-pause')).to.have.lengthOf(1);
      expect(wrap.find('.glyphicon-play')).to.have.lengthOf(0);
    });
  });
});
