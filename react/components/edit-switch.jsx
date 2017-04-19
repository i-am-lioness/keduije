import React from 'react';
import PropTypes from 'prop-types';

function EditSwitch(props) {
  return (<label className="switch" htmlFor="edit-switch">
    <input
      id="edit-switch"
      type="checkbox"
      checked={props.editMode}
      onChange={props.toggleEditMode}
    />
    <div className="slider" />
  </label>);
}

EditSwitch.propTypes = {
  editMode: PropTypes.bool.isRequired,
  toggleEditMode: PropTypes.func.isRequired,
};

export default EditSwitch;
