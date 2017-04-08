import React from 'react';
import PropTypes from 'prop-types';

function PencilIcon(props) {
  const hoveredClass = (props.hoveredIdx === props.idx) ? ' hover' : '';

  return (<span
    className={'glyphicon glyphicon-pencil ' + hoveredClass}
    aria-hidden="true"
    onClick={this.props.onClick}
  />);
}

PencilIcon.defaultProps = {
  hoveredIdx: null,
  idx: null,
};

PencilIcon.propTypes = {
  hoveredIdx: PropTypes.number,
  idx: PropTypes.number,
};

export default PencilIcon;
