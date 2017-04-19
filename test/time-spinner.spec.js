/* eslint-env mocha */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import TimeSpinner from '../react/components/time-spinner';


describe('<TimeSpinner />', () => {
  it('displays "0:00" for 0 seconds', () => {
    const wrapper = mount(<TimeSpinner
      className="col-md-5"
      id="end-spinner"
      variableName="segmentEnd"
      label="To"
      seconds={0}
      increment={() => {}}
      decrement={() => {}}
    />);

    expect(wrapper.find('.display').text()).to.equal('0:00');
  });

  it('increments time when up button is pressed', () => {
  });

  it('decrements time when down button is pressed', () => {

  });

  it('increments time by number of time up button is pressed', () => {
    
  });

  it('decrements time by number of times down button is pressed', () => {
    
  });

  it('can handle large time marks', () => {
    
  });

});
