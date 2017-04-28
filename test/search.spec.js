/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import Search from '../react/components/search';
import { KeduIje } from './utils/mocks';

describe('<Search />', () => {
  let wrapper;
  let revertKeduIje;

  before(function () {
    revertKeduIje = Search.__Rewire__('KeduIje', KeduIje);
  });

  beforeEach(function () {
    wrapper = shallow(<Search />);
  });

  after(function () {
    revertKeduIje();
  });

  describe('desktop', function () {
    let width;
    beforeEach(function () {
      width = wrapper.find('input').props().style.width;
      expect(width).to.be.null;
      wrapper.find('input').simulate('focus');
    });

    it('expands when clicked', function () {
      width = wrapper.find('input').props().style.width;
      expect(width).to.equal('500px');
    });

    it('input compresses when blured', function (done) {
      width = wrapper.find('input').props().style.width;
      expect(width).to.equal('500px');
      wrapper.find('input').simulate('blur');
      setTimeout(() => {
        width = wrapper.find('input').props().style.width;
        expect(width).to.be.null;
        done();
      }, 600);
    });

    it('displays search results', function (done) {
      const e = { target: { value: 'w' } };
      expect(wrapper.find('.search-result')).to.have.lengthOf(0);
      wrapper.find('input').simulate('change', e);
      setTimeout(() => {
        expect(wrapper.find('.search-result')).to.have.lengthOf(2);
        done();
      }, 100);
    });

    it('clears input results when input cleared', function (done) {
      const e = { target: { value: 'w' } };
      expect(wrapper.find('.search-result')).to.have.lengthOf(0);
      wrapper.find('input').simulate('change', e);
      setTimeout(() => {
        expect(wrapper.find('.search-result')).to.have.lengthOf(2);
        e.target.value = '';
        wrapper.find('input').simulate('change', e);
        expect(wrapper.find('.search-result')).to.have.lengthOf(0);
        done();
      }, 100);
    });
  });

  describe('mobile', function () {
    beforeEach(function () {
      expect(wrapper.find('.glyphicon-remove')).to.have.lengthOf(0);
      wrapper.find('.glyphicon-search').simulate('click');
    });

    it('shows mobile view', function () {
      expect(wrapper.find('.glyphicon-remove')).to.have.lengthOf(1);
    });

    it('close search button works on small screens', function () {
      expect(wrapper.find('.glyphicon-remove')).to.have.lengthOf(1);
      wrapper.find('.glyphicon-remove').simulate('click');
      expect(wrapper.find('.glyphicon-remove')).to.have.lengthOf(0);
    });
  });

  it('[integration?] does not list removed media', function () {

  });
});
