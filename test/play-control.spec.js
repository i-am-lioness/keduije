/* eslint-env mocha */
import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import PlayControl from '../react/components/play-control';

const togglePlayState = () => {};
describe('<PlayControl />', () => {

  it('shows play image when paused (not playing) ', () => {

    const control = shallow(
      <PlayControl isPlaying togglePlayState={togglePlayState} />
    ).find('span');

    expect(control.hasClass('glyphicon-pause')).to.equal(true);
    expect(control.hasClass('glyphicon-play')).to.equal(false);
  });

  it('shows pause image when playing', () => {

    const control = shallow(
      <PlayControl isPlaying={false} togglePlayState={togglePlayState} />
    ).find('span');

    expect(control.hasClass('glyphicon-pause')).to.equal(false);
    expect(control.hasClass('glyphicon-play')).to.equal(true);

  });

});
