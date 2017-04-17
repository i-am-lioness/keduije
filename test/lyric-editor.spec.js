/* eslint-env mocha */
import React from 'react';
import { expect } from 'chai';
import { mount, shallow } from 'enzyme';
import sinon from 'sinon';
import LyricEditor from '../react/components/lyric-editor';
import Keduije from '../react/keduije';
import TimeSpinner from '../react/components/time-spinner';

import { lyrics } from './utils/data';

const event = { preventDefault: () => undefined };

describe('<LyricEditor />', () => {
  describe('basic rendering', function () {
    const handleDelete = sinon.spy();
    const handleTextChange = sinon.spy();
    const saveLyric = sinon.spy();
    const close = sinon.spy();
    const playSegment = sinon.spy();
    const decrementTime = sinon.spy();
    const incrementTime = sinon.spy();
    const percentage = 0;

    let startTime = 5;
    let endTime = 10;

    const editorClass = (<LyricEditor
      segmentStart={startTime}
      segmentEnd={endTime}
      incrementTime={incrementTime}
      decrementTime={decrementTime}
      percentage={percentage || 0}
      playLyric={(e) => { playSegment(true, e); }}
      displayed={false}
      originalText={null}
      editMode={false}
      mode={Keduije.editModes.ADD}
      close={close}
      saveLyric={saveLyric}
      value={''}
      handleChange={handleTextChange}
      onDelete={handleDelete}
    />);

    let wrap = null;

    it('opens with the right time segements', function () {
      wrap = shallow(editorClass);
      wrap.setProps({ displayed: true, editMode: true });
      expect(wrap.find(TimeSpinner).at(0).prop('seconds')).to.equal(5);
      expect(wrap.find(TimeSpinner).at(1).prop('seconds')).to.equal(10);
    });

    it('says "save" for sumbit button, and has no "original text"', function () {
      const submitBtn = wrap.find('#save-lyric-btn');
      expect(submitBtn.text()).to.equal('Add');
      expect(wrap.find('.originalText')).to.have.length(0);
    });

    it('allows users to change time markers ', () => {
      const spinners = wrap.find(TimeSpinner);
      spinners.at(0).dive().instance().increment();
      expect(incrementTime.calledWithExactly('segmentStart')).to.be.true;
      spinners.at(1).dive().instance().increment();
      expect(incrementTime.lastCall.calledWithExactly('segmentEnd')).to.be.true;
      spinners.at(0).dive().instance().decrement();
      expect(incrementTime.calledWithExactly('segmentStart')).to.be.true;
      spinners.at(1).dive().instance().decrement();
      expect(incrementTime.lastCall.calledWithExactly('segmentEnd')).to.be.true;
    });

    it('sends new line info on submit', function () {
      wrap.find('#lyricEditor').simulate('submit', event);
      expect(saveLyric.called).to.be.true;
    });

    it('has play button play only the segment of the video that is being edited', function () {
      wrap.find('#playLyric').simulate('click', event);
      expect(playSegment.calledWith(true)).to.be.true;
    });
  });

  describe('DOM interaction', function () {
    const handleDelete = sinon.spy();
    const handleTextChange = sinon.spy();
    const saveLyric = sinon.spy();
    const close = sinon.spy();
    const decrementTime = sinon.spy();
    const incrementTime = sinon.spy();
    const percentage = 0;
    const playSegment = sinon.spy();

    const currentLine = lyrics[1];

    const editorClass = (<LyricEditor
      segmentStart={currentLine.startTime}
      segmentEnd={currentLine.endTime}
      incrementTime={incrementTime}
      decrementTime={decrementTime}
      percentage={percentage || 0}
      playLyric={(e) => { playSegment(true, e); }}
      displayed={false}
      originalText={currentLine.text}
      editMode={false}
      mode={Keduije.editModes.UPDATE}
      close={close}
      saveLyric={saveLyric}
      value={currentLine.text}
      handleChange={handleTextChange}
      onDelete={handleDelete}
    />);

    let wrap = null;

    it('mounts and displays (with draggable error for now)', function () {
      wrap = mount(editorClass);
      wrap.setProps({ displayed: true });
      expect(() => {
        wrap.setProps({ editMode: true });
      }).to.Throw(TypeError);
    });

    it('shows different dialog for editing vs creating lines ', function () {
      const submitBtn = wrap.find('#save-lyric-btn');
      expect(submitBtn.text()).to.equal('Update');
      expect(wrap.find('.originalText')).to.have.length(1);
    });

    it('moves tail with time mark', function () {
      const calculateTail = sinon.spy(wrap.instance(), 'calculateTail');
      wrap.setProps({ percentage: 0.5 });
      expect(calculateTail.called).to.be.true;
      expect(calculateTail.returned(sinon.match(',50'))).to.be.true;
    });

    it('is draggable');
  });
});
