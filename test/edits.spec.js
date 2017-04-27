/* eslint-env mocha, browser */
import React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';
import Edits from '../react/components/edits';
import { KeduIje } from './utils/mocks';


describe.skip('<Edits />', () => {
  let revertKeduIje;
  let wrapper;
  const component = (<Edits mediaID={'58e46ebdf3a3f330ed306e75'} />);

  before(function () {
    revertKeduIje = Edits.__Rewire__('KeduIje', KeduIje);
  });

  beforeEach(function () {
    wrapper = shallow(component);
  });

  after(function () {
    revertKeduIje();
  });

  it('shows all edits for media', function () {
    expect(wrapper.find('.panel')).to.have.lengthOf();
  });

  it('shows diff for changed text', function () {
    wrapper.find('strong');
  });

  it('hides "show more button" when there are no more revisions', function () {
    const showMoreBtn = wrapper.find('button').at(0);
    showMoreBtn.simulate('click');
    showMoreBtn.simulate('click');
    expect(wrapper.find('button')).to.have.lengthOf();
  });

  it('creates valid link to song page', function () {
    wrapper.find('.song-title').forEach(a => {
      expect(a.props().href).to.match();
    });
  });

  it('does not display empty changesets', function () {
    wrapper.find('.panel').forEach((cs) => {
      expect(cs.find('.list-group')).not.to.have.lengthOf(0);
    });
  });

  it('sorts edits within a changeset by time', function () {
    wrapper.find('.panel').forEach((cs) => {
      cs.find('a').forEach(edit => {
        edit.props().href;
      });
    });
  });

  it('only displays revisions that are "done"');

  it('only shows time changes, when time changed');

  it('includes song creations');

  it('shows page title');

  it('shows song edit');

  it('should hide "show more" button by default');

  it('shows all edits for user', function () {

  });

  it('[integration] show line adds', function () {

  });

  it('[integration] show line edits', function () {

  });

  it('[integration] show song adds', function () {

  });

  it('[integration] shows line deletions', function () {

  });

  it('[integration] shows song removals', function () {

  });

  it('[integration] shows time changes', function () {

  });

  it('[integration] shows "changesets"- aggregate edits within edit session', function () {

  });
});
