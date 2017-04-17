/* eslint-env mocha */
import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import PencilIcon from '../react/components/pencil-icon';

describe('<PencilIcon />', () => {
  const handleClick = sinon.spy();

  const pencilClass = (<PencilIcon
    onClick={handleClick}
    idx={5}
    hoveredIdx={6}
  />);

  let wrap = null;

  it('is not hovered by default', function () {
    wrap = shallow(pencilClass);
    expect(wrap.find('.hover')).to.have.lengthOf(0);
  });

  it('shows hover effect once hovered"', function () {
    wrap.setProps({ hoveredIdx: 5 });
    expect(wrap.find('.hover')).to.have.lengthOf(1);
  });

  it('handles clicks whether hovered or not"', function () {
    wrap.find('span').simulate('click');
    expect(handleClick.calledOnce).to.be.true;
    wrap.setProps({ hoveredIdx: 6 });
    wrap.find('span').simulate('click');
    expect(handleClick.calledTwice).to.be.true;
  });
});
