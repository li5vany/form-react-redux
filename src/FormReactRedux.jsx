import React from 'react';
import {connect} from 'react-redux';
import * as types from './types';

const regex = {
  htmlID: /^[a-zA-Z][\w:.-]*$/g,
  bracket: /\[(.*)\]/i,
  decimal: /^\d+\.?\d*$/,
  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
  escape: /[-[\]/{}()*+?.\\^$|]/g,
  flags: /^\/(.*)\/(.*)?/,
  integer: /^-?\d+$/,
  naturalNumber: /^\d+$/,
  number: /^-?\d*(\.\d+)?$/,
  url: /(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/i,
  alphanumeric: /^[\w\d.\-+,:/\\!?]+$/i,
  word: /^\w+$/i
};

const adjustOffset = (el, offset) => {
  let val = el.value, newOffset = offset;
  if (val.indexOf("\r\n") > -1) {
    let matches = val.replace(/\r\n/g, "\n").slice(0, offset).match(/\n/g);
    newOffset += matches ? matches.length : 0;
  }
  return newOffset;
};

export const getValueFromFormReactRedux = (formName, formReactRedux, value, type, defaultValue) => formName && formReactRedux[formName] && typeof formReactRedux[formName][value] !== 'undefined'
&& (
  (type === 'array' && Array.isArray(formReactRedux[formName][value]))
  || (type === 'object' && typeof formReactRedux[formName][value] === type && !Array.isArray(formReactRedux[formName][value]))
  || (typeof formReactRedux[formName][value] === type)
) ? formReactRedux[formName][value] : defaultValue;

export const getUniqueKey = () => Math.floor(Math.random() * 10000) + '' + Math.floor(Math.random() * 10000);

// TODO: checkbox not notification onchange when edit other form
const FormReactRedux = ({children, formName, defaultValues, submit, onChange, language, formReactRedux, formReactReduxOnChange, formReactReduxUndo, formReactReduxRedo}) => {
  console.log('formReactRedux', formReactRedux);

  let values = getValueFromFormReactRedux(formName, formReactRedux, 'values', 'object', defaultValues && typeof defaultValues === "object" ? defaultValues : {}),
    errors = getValueFromFormReactRedux(formName, formReactRedux, 'errors', 'object', {}),
    validation = getValueFromFormReactRedux(formName, formReactRedux, 'validation', 'object', {}),
    lastValues = getValueFromFormReactRedux(formName, formReactRedux, 'lastValues', 'object', {}),
    blurs = getValueFromFormReactRedux(formName, formReactRedux, 'blurs', 'object', {}),
    isActive = getValueFromFormReactRedux(formName, formReactRedux, 'isActive', 'boolean', false),
    focus = getValueFromFormReactRedux(formName, formReactRedux, 'focus', 'string', ''),
    selectionStart = getValueFromFormReactRedux(formName, formReactRedux, 'selectionStart', 'number', 0),
    selectionEnd = getValueFromFormReactRedux(formName, formReactRedux, 'selectionEnd', 'number', 0),
    history = getValueFromFormReactRedux(formName, formReactRedux, 'history', 'array', []),
    historyIndex = getValueFromFormReactRedux(formName, formReactRedux, 'historyIndex', 'number', 0),
    isValid = true;

  const doTheChange = () => {
    let tmp = {}, array = history;
    history = [];
    for (let i in array) {
      if (i <= historyIndex) {
        history.push(array[i]);
      }
    }
    historyIndex = history.push({
      validation: {...validation},
      lastValues: {...lastValues},
      values: {...values},
      errors: {...errors},
      blurs: {...blurs},
      selectionStart,
      selectionEnd,
      historyIndex,
      isActive: true,
      isValid,
      focus
    });
    historyIndex--;
    history[historyIndex].historyIndex = historyIndex;
    tmp[formName] = {
      validation: {...validation},
      lastValues: {...lastValues},
      values: {...values},
      errors: {...errors},
      blurs: {...blurs},
      selectionStart,
      selectionEnd,
      historyIndex,
      history,
      isActive: true,
      isValid,
      focus
    };

    if (formReactRedux) {
      let formReactReduxTmp = {...formReactRedux};
      for (let i in formReactReduxTmp) {
        if (formReactReduxTmp[i] && typeof formReactReduxTmp[i].isActive === 'boolean') {
          formReactReduxTmp[i].isActive = i === formName;
        }
      }
      formReactReduxOnChange({...formReactReduxTmp, ...tmp});
    } else {
      formReactReduxOnChange(tmp);
    }
  };

  if (window) {
    window.onkeyup = (e) => {
      if (e.ctrlKey && ((e.keyCode === 90 && e.shiftKey) || e.keyCode === 89)) {
        formReactReduxRedo(formName);
      } else if (e.keyCode === 90 && e.ctrlKey) {
        formReactReduxUndo(formName);
      }
    }
  }

  const onChangeValue = (name, value, e) => {
    lastValues[name] = values[name];
    values[name] = value;
    validationFn(name);
    focus = name;
    selectionStart = e.target.selectionStart || value.toString().length;
    selectionEnd = e.target.selectionEnd || value.toString().length;
    let tmpIsValid = true;
    for (let i in values) {
      if (!tmpIsValid) {
        break;
      }
      tmpIsValid = validationInitialFn(i);
    }
    isValid = tmpIsValid;
    doTheChange();
    if (onChange && e) {
      onChange(name, values, e);
    }
  };

  const initValidation = (item, tag) => {
    if (item.props.required) {
      validation[tag] = {required: true};
    }
    if (item.props.pattern) {
      validation[tag] = {...validation[tag], pattern: item.props.pattern, errorMessage: item.props.errormessage};
    } else {
      if (item.props.type === 'number') {
        validation[tag] = {...validation[tag], regex: 'number', errorMessage: 'This field most be number'};
        if (item.props.naturalNumber) {
          validation[tag] = {...validation[tag], regex: 'naturalNumber', errorMessage: 'This field most be natural number'};
        }
      } else if (item.props.type === 'email') {
        validation[tag] = {...validation[tag], regex: 'email', errorMessage: 'This field most be email'};
      } else {
        if (item.props.alphanumeric) {
          validation[tag] = {...validation[tag], regex: 'alphanumeric', errorMessage: 'This field most be alphanumeric'};
        } else if (item.props.word) {
          validation[tag] = {...validation[tag], regex: 'word', errorMessage: 'This field most be words'};
        }
      }
    }
  };

  const getText = (message) => message && language && language[message] ? language[message] : message;

  const isValidFn = (tag, name) => regex[tag].test(values[name]);

  const validationFn = (name) => {
    if (validation[name]) {
      const genericWrongText = getText('This field is wrong');
      if (!values[name] && validation[name].required === true) {
        errors[name] = getText("This field is required");
      } else if ((values[name] && validation[name].required) || !validation[name].required) {
        if (validation[name].pattern) {
          errors[name] = validation[name].pattern.test(values[name]) ? '' : (validation[name].errorMessage ? getText(validation[name].errorMessage) : genericWrongText);
        } else if (validation[name].regex) {
          errors[name] = isValidFn(validation[name].regex, name) ? '' : (validation[name].errorMessage ? getText(validation[name].errorMessage) : genericWrongText);
        } else {
          errors[name] = ''
        }
      }
    }
  };

  const validationInitialFn = (name) => {
    if (validation[name]) {
      if (!values[name] && validation[name].required === true) {
        return false;
      } else if ((values[name] && validation[name].required) || !validation[name].required) {
        if (validation[name].pattern) {
          return validation[name].pattern.test(values[name]);
        } else if (validation[name].regex) {
          return isValidFn(validation[name].regex, name);
        }
      }
    }
    return true;
  };

  const refactorField = (item) => {
    let object = {key: formName + '-' + getUniqueKey()};
    const isInput = item.type === 'input';
    const isSubmit = item.type === 'input' && item.props && item.props.type === "submit";
    const isCheckbox = item.type === 'input' && item.props && item.props.type === "checkbox";
    const isFile = item.type === 'input' && item.props && item.props.type === "file";
    const isRange = item.type === 'input' && item.props && item.props.type === "range";
    const isColor = item.type === 'input' && item.props && item.props.type === "color";
    const isRadio = item.type === 'input' && item.props && item.props.type === "radio";
    const isPassword = item.type === 'input' && item.props && item.props.type === "password";
    const isSelect = item.type === 'select';
    const isTextArea = item.type === 'textarea';
    if (formName && ((isInput && !isSubmit) || isSelect || isTextArea)) {
      let tag = '';
      if (item.props && item.props.name) {
        tag = item.props.name;
      } else {
        tag = 'name-' + getUniqueKey();
      }
      if (values[tag]) {
        values[tag] = values[tag];
      } else if (isCheckbox && item.props.value) {
        values[tag] = item.props.value;
      } else {
        values[tag] = '';
      }
      initValidation(item, tag);
      object['name'] = tag;
      if (isRadio) {
        object['checked'] = values[tag] === item.props.value;
      } else if (isCheckbox) {
        object['checked'] = typeof values[tag] === 'boolean' || item.props.checked;
      } else {
        object['value'] = values[tag];
      }
      if (isValid && validationInitialFn(tag) === false) {
        isValid = false;
      }

      let readOnlyField = !(isSelect || isRadio || isCheckbox || isFile || isRange || isColor);

      const focused = formReactRedux[formName] && formReactRedux[formName].focus;
      if (readOnlyField) {
        if (focused && formReactRedux[formName].focus === tag && isActive === true) {
          if (!item.props.readOnly) {
            object['readOnly'] = false;
          }
          object["onFocus"] = (e) => {
            const lastValue = lastValues[e.target.name],
              value = e.target.value;
            if (!selectionStart && !selectionEnd) {
              if (typeof lastValue === 'string') {
                for (let i in lastValue) {
                  if (lastValue[i] !== value[i]) {
                    selectionStart = selectionEnd = i;
                    break;
                  }
                }
              }
              if (e.target.value && !selectionStart && !selectionEnd) {
                selectionStart = e.target.value.toString().length;
                selectionEnd = e.target.value.toString().length;
              }
            }
            if (e.target.setSelectionRange && /text|password|search|tel|url/.test(e.target.type)) {
              e.target.setSelectionRange(adjustOffset(e.target, selectionStart), adjustOffset(e.target, selectionEnd));
            } else if (e.target.createTextRange) {
              let range = e.target.createTextRange();
              range.collapse(true);
              range.moveEnd('character', selectionStart);
              range.moveStart('character', selectionEnd);
              range.select();
            }
            if (item.props.onFocus) {
              item.props.onFocus(e);
            }
          };
          object["autoFocus"] = true;
        } else {
          if (!item.props.readOnly) {
            object['readOnly'] = true;
          }
          object["onFocus"] = (e) => {
            focus = tag;
            if (typeof values[tag] === 'string' && !isPassword) {
              values[tag] = values[tag].trim();
              validationFn(tag);
            }
            doTheChange();
            if (item.props.onFocus) {
              item.props.onFocus(e);
            }
          };
        }
      }
      object["onBlur"] = (e) => {
        validationFn(e.target.name);
        focus = '';
        blurs[e.target.name] = true;
        selectionStart = 0;
        selectionEnd = 0;
        if (typeof values[e.target.name] === 'string' && !isPassword) {
          values[e.target.name] = values[e.target.name].trim();
          validationFn(e.target.name);
        }
        // doTheChange();
        if (item.props.onBlur) {
          item.props.onBlur(e);
        }
      };
      object['onChange'] = (e) => {
        e.preventDefault();
        if (focused || !readOnlyField) {
          let name = e.target.name, value = '';
          if (!item.props || !item.props.type) {
            value = e.target.value;
          } else if (item.props.type === "checkbox") {
            value = e.target.checked;
          } else if (item.props.type === "file") {
            value = e.target.files;
          } else {
            value = e.target.value;
          }
          onChangeValue(name, value, e);
          if (item.props.onChange) {
            item.props.onChange(e);
          }
        }
      };
      if (item.props && item.props.noerrormessage) {
        return React.cloneElement(item, object);
      }
      return [React.cloneElement(item, object), <span key={getUniqueKey()} className="text-alert">{errors && errors[tag] && blurs && blurs[tag] ? errors[tag] : <span>&nbsp;</span>}</span>];
    }
    return React.cloneElement(item, object);
  };

  const childrenMap = (children) => {
    return children.map(item => {
      if (React.isValidElement(item)) {
        item = refactorField(item);
        if (item.props && item.props.children) {
          return React.cloneElement(item, {key: formName + '-' + getUniqueKey(), children: childrenMap(Array.isArray(item.props.children) ? item.props.children : [item.props.children])});
        }
      }
      return item;
    });
  };

  return (
    <div>
      {formName ?
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) {
              if (submit) {
                submit(values, e);
              }
            } else {
              for (let i in values) {
                blurs[i] = true;
                validationFn(i);
              }
              doTheChange();
            }
          }}>
          {childrenMap(Array.isArray(children) ? children : [children])}
        </form>
        : <div>►Please declare a name for this form‼</div>}
    </div>
  );
};

const mapStateToProps = store => {
  return {
    formReactRedux: store.formReactRedux
  };
};

const mapDispatchProps = dispatch => {
  return {
    formReactReduxOnChange: (formReactRedux) => {
      dispatch({type: types.FORM_REACT_REDUX_CHANGE, data: formReactRedux})
    },
    formReactReduxReset: (formReactRedux) => {
      dispatch({type: types.FORM_REACT_REDUX_RESET, data: formReactRedux})
    },
    formReactReduxUndo: (formName) => {
      dispatch({type: types.FORM_REACT_REDUX_UNDO, formName})
    },
    formReactReduxRedo: (formName) => {
      dispatch({type: types.FORM_REACT_REDUX_REDO, formName})
    }
  }
};

export default connect(mapStateToProps, mapDispatchProps)(FormReactRedux);
