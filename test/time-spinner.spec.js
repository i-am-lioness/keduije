/* eslint-env mocha */
/* eslint-disable */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import TimeSpinner from '../react/components/time-spinner';


describe('<TimeSpinner />', () => {

  it('displays "0:00" for 0 seconds', () => {

    const wrapper = mount( <TimeSpinner
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

});