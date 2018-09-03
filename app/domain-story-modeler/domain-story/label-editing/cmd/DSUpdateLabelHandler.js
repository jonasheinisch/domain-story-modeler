import {
  setLabel,
  getLabel,
  setNumber,
  getNumber
} from '../DSLabelUtil';

import {
  getExternalLabelMid,
  isLabelExternal,
  hasExternalLabel,
  isLabel
} from 'bpmn-js/lib/util/LabelUtil';

import {
  getBusinessObject,
  is
} from 'bpmn-js/lib/util/ModelUtil';

var NULL_DIMENSIONS = {
  width: 0,
  height: 0
};


/**
 * a handler that updates the text of a BPMN element.
 */
export default function DSUpdateLabelHandler(modeling, textRenderer) {

  /**
   * Set the label and return the changed elements.
   *
   * Element parameter can be label itself or connection (i.e. sequence flow).
   *
   * @param {djs.model.Base} element
   * @param {String} text
   */
  function setText(element, text, textNumber) {

    // external label if present
    var label = element.label || element;

    var number= element.number || element;

    var labelTarget = element.labelTarget || element;

    var numberTarget= element.numberTarget || element;

    setLabel(label, text);
    setNumber(number, textNumber);

    return [ label, labelTarget, number, numberTarget ];
  }

  function preExecute(ctx) {
    var element = ctx.element,
        businessObject = element.businessObject,
        newLabel = ctx.newLabel,
        newNumber=ctx.newNumber;

    if (!isLabel(element)
        && isLabelExternal(element)
        && !hasExternalLabel(element)
        && (newLabel !== '' || newNumber!=='')) {

      // create label
      var paddingTop = 7;

      var labelCenter = getExternalLabelMid(element);

      labelCenter = {
        x: labelCenter.x,
        y: labelCenter.y + paddingTop
      };

      modeling.createLabel(element, labelCenter, {
        id: businessObject.id + '_label',
        businessObject: businessObject
      });
    }
  }

  DSUpdateLabelHandler.execute = function(ctx) {
    ctx.oldLabel = getLabel(ctx.element);
    ctx.oldNumber= getNumber(ctx.element);
    return setText(ctx.element, ctx.newLabel, ctx.newNumber);
  };

  function revert(ctx) {
    return setText(ctx.element, ctx.oldLabel), ctx.oldNumber;
  }

  function postExecute(ctx) {
    var element = ctx.element,
        label = element.label || element,
        newLabel = ctx.newLabel,
        newBounds = ctx.newBounds;

    if (isLabel(label) && newLabel.trim() === '') {
      modeling.removeShape(label);

      return;
    }

    // ignore internal labels for elements except text annotations
    if (!isLabelExternal(element) && !is(element, 'domainStory:textAnnotation')) {
      return;
    }

    var bo = getBusinessObject(label);

    var text = bo.name || bo.text;

    // don't resize without text
    if (!text) {
      return;
    }

    // resize element based on label _or_ pre-defined bounds
    if (typeof newBounds === 'undefined') {
      newBounds = textRenderer.getLayoutedBounds(label, text);
    }

    // setting newBounds to false or _null_ will
    // disable the postExecute resize operation
    if (newBounds) {
      modeling.resizeShape(label, newBounds, NULL_DIMENSIONS);
    }
  }

  // API

  this.preExecute = preExecute;
  // this.execute = execute;
  this.revert = revert;
  this.postExecute = postExecute;
}

DSUpdateLabelHandler.$inject = [
  'modeling',
  'textRenderer'
];