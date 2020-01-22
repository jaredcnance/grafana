import React, { MouseEvent, PureComponent } from 'react';
import debounce from 'lodash/debounce';
import { e2e } from '@grafana/e2e';

import { QueryVariableModel, VariableHide, VariableModel, VariableOption, VariableType } from '../variable';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { store } from '../../../store/store';
import { StoreState } from 'app/types/store';
import { distinctUntilChanged } from 'rxjs/operators';
import { ClickOutsideWrapper } from '@grafana/ui';
import { hideQueryVariableDropDown, selectVariableOption, showQueryVariableDropDown } from '../state/actions';
import { QueryVariablePickerState, QueryVariableState, VariableState } from '../state/queryVariablesReducer';
import { variableAdapter } from '../adapters';

export interface Props {
  name: string;
}

export const subscribeToVariableChanges = <P extends {} = {}, M extends VariableModel = VariableModel>(
  name: string,
  type: VariableType
) => {
  const stateSelector = (state: StoreState): VariableState<P, M> => {
    const typeState = state.templating[type];
    const variableState = typeState.find(s => s.variable.name === name);
    return variableState;
  };

  return new Observable((observer: Subscriber<VariableState<P, M>>) => {
    const unsubscribeFromStore = store.subscribe(() => observer.next(stateSelector(store.getState())));
    observer.next(stateSelector(store.getState()));
    return function unsubscribe() {
      unsubscribeFromStore();
    };
  }).pipe(
    distinctUntilChanged<VariableState<P, M>>((previous, current) => {
      return previous === current;
    })
  );
};

export class QueryVariablePicker extends PureComponent<Props, QueryVariableState> {
  private readonly debouncedOnQueryChanged: Function;
  private readonly subscription: Subscription = null;
  constructor(props: Props) {
    super(props);
    this.debouncedOnQueryChanged = debounce((searchQuery: string) => {
      this.onQueryChanged(searchQuery);
    }, 200);
    this.subscription = subscribeToVariableChanges<QueryVariablePickerState, QueryVariableModel>(
      props.name,
      'query'
    ).subscribe({
      next: state => {
        if (this.state) {
          this.setState({ ...state });
          return;
        }

        this.state = state;
      },
    });
  }

  componentDidMount(): void {
    // const queryHasSearchFilter = this.state.variable ? containsSearchFilter(this.state.variable.query) : false;
    // const selectedTags = this.state.variable?.current?.tags ?? [];
    // this.setState({
    //   queryHasSearchFilter,
    //   selectedTags,
    // });
    // this.updateLinkText();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<QueryVariableState>): void {
    //   if (prevState.variable.options !== this.state.variable.options) {
    //     this.setState({
    //       searchOptions: this.state.variable.options.slice(0, Math.min(this.state.variable.options.length, 1000)),
    //     });
    //   }
    //   this.updateLinkText();
  }

  componentWillUnmount(): void {
    this.subscription.unsubscribe();
  }

  onShowDropDown = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    event.preventDefault();
    store.dispatch(showQueryVariableDropDown(this.state.variable));
    // const { tags, current, options } = this.state.variable;
    // const newTags = tags
    //   ? tags.map(tag => {
    //       const currentTag = current?.tags?.filter(t => t.text === tag.text)[0];
    //       return currentTag || { text: tag.text, selected: false };
    //     })
    //   : [];
    //
    // // new behaviour, if this is a query that uses searchfilter it might be a nicer
    // // user experience to show the last typed search query in the input field
    // const searchQuery = this.state.queryHasSearchFilter && this.state.searchQuery ? this.state.searchQuery : '';
    //
    // // this.search = {
    // //   query,
    // //   options: this.options.slice(0, Math.min(this.options.length, 1000)),
    // // };
    //
    // // this.dropdownVisible = true;
    // this.setState({
    //   showDropDown: true,
    //   highlightIndex: -1,
    //   selectedValues: options.filter(option => option.selected),
    //   tags: newTags,
    //   searchQuery,
    //   searchOptions: options.slice(0, Math.min(options.length, 1000)),
    // });
  };

  // updateLinkText = () => {
  //   const { current, options } = this.state.variable;
  //
  //   if (!current.tags || current.tags.length === 0) {
  //     this.setState({ linkText: current.text });
  //     return;
  //   }
  //
  //   // filer out values that are in selected tags
  //   const selectedAndNotInTag = options.filter(option => {
  //     if (!option.selected) {
  //       return false;
  //     }
  //     for (let i = 0; i < current.tags.length; i++) {
  //       const tag = current.tags[i];
  //       if (tag.values.findIndex(value => value === option.value) !== -1) {
  //         return false;
  //       }
  //     }
  //     return true;
  //   });
  //
  //   // convert values to text
  //   const currentTexts = map(selectedAndNotInTag, 'text');
  //
  //   // join texts
  //   let linkText = currentTexts.join(' + ');
  //   if (linkText.length > 0) {
  //     linkText += ' + ';
  //   }
  //   this.setState({ linkText });
  // };

  selectValue = (option: VariableOption, event: MouseEvent<HTMLAnchorElement>, commitChange = false) => {
    event.stopPropagation();
    event.preventDefault();
    if (!option) {
      return;
    }

    store.dispatch(selectVariableOption({ variable: this.state.variable, option, forceSelect: commitChange, event }));
  };

  commitChanges = () => {
    const { queryHasSearchFilter, oldVariableText } = this.state.picker;

    if (queryHasSearchFilter) {
      // this.updateLazyLoadedOptions();
    }

    if (this.state.variable.current.text !== oldVariableText) {
      variableAdapter[this.state.variable.type].setValue(this.state.variable, this.state.variable.current);
    }
    store.dispatch(hideQueryVariableDropDown(this.state.variable));
  };

  onQueryChanged = (searchQuery: string) => {
    // const { queryHasSearchFilter } = this.state;
    // const { options } = this.state.variable;
    // if (queryHasSearchFilter) {
    //   // dispatch call to thunk instead
    //   // await this.updateLazyLoadedOptions();
    //   return;
    // }
    //
    // this.setState({
    //   searchQuery,
    //   searchOptions: options.filter(option => {
    //     const text = Array.isArray(option.text) ? option.text[0] : option.text;
    //     return text.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
    //   }),
    // });
  };

  onCloseDropDown = () => {
    this.commitChanges();
  };

  render() {
    const {
      linkText,
      selectedTags,
      searchQuery,
      showDropDown,
      selectedValues,
      highlightIndex,
      tags,
      options,
    } = this.state.picker;

    if (!this.state.variable) {
      return <div>Couldn't load variable</div>;
    }

    const { name, hide, multi } = this.state.variable;
    let { label } = this.state.variable;

    label = label || name;
    return (
      <div className="gf-form">
        {hide !== VariableHide.hideLabel && (
          <label
            className="gf-form-label template-variable"
            aria-label={e2e.pages.Dashboard.SubMenu.selectors.submenuItemLabels(label)}
          >
            {label}
          </label>
        )}
        {hide !== VariableHide.hideVariable && (
          <div className="variable-link-wrapper">
            {!showDropDown && (
              <a
                onClick={this.onShowDropDown}
                className="variable-value-link"
                aria-label={e2e.pages.Dashboard.SubMenu.selectors.submenuItemValueDropDownValueLinkTexts(`${linkText}`)}
              >
                {linkText}
                {selectedTags.map(tag => {
                  return (
                    <span bs-tooltip="tag.valuesText" data-placement="bottom" key={`${tag.text}`}>
                      {/*<span className="label-tag" tag-color-from-name="tag.text">*/}
                      <span className="label-tag">
                        &nbsp;&nbsp;<i className="fa fa-tag"></i>&nbsp; {tag.text}
                      </span>
                    </span>
                  );
                })}
                <i className="fa fa-caret-down" style={{ fontSize: '12px' }}></i>
              </a>
            )}

            {showDropDown && (
              <ClickOutsideWrapper onClick={this.onCloseDropDown}>
                <input
                  ref={instance => {
                    if (instance) {
                      instance.focus();
                      instance.setAttribute('style', `width:${Math.max(instance.width, 80)}px`);
                    }
                  }}
                  type="text"
                  className="gf-form-input"
                  value={searchQuery}
                  onChange={event => this.debouncedOnQueryChanged(event.target.value)}
                  // inputEl.css('width', Math.max(linkEl.width(), 80) + 'px');
                  // ng-keydown="vm.keyDown($event)"
                  // ng-model="vm.search.query"
                  // ng-change="vm.debouncedQueryChanged()"
                />
              </ClickOutsideWrapper>
            )}

            {showDropDown && (
              <ClickOutsideWrapper onClick={this.onCloseDropDown}>
                <div
                  className={`${multi ? 'variable-value-dropdown multi' : 'variable-value-dropdown single'}`}
                  aria-label={e2e.pages.Dashboard.SubMenu.selectors.submenuItemValueDropDownDropDown}
                >
                  <div className="variable-options-wrapper">
                    <div className="variable-options-column">
                      {multi && (
                        <a
                          className={`${
                            selectedValues.length > 1
                              ? 'variable-options-column-header many-selected'
                              : 'variable-options-column-header'
                          }`}
                          // bs-tooltip="'Clear selections'"
                          data-placement="top"
                          // ng-click="vm.clearSelections()"
                        >
                          <span className="variable-option-icon"></span>
                          Selected ({selectedValues.length})
                        </a>
                      )}
                      {options.map((option, index) => {
                        const selectClass = option.selected
                          ? 'variable-option pointer selected'
                          : 'variable-option pointer';
                        const highlightClass = index === highlightIndex ? `${selectClass} highlighted` : selectClass;
                        return (
                          <a
                            key={`${option.value}`}
                            className={highlightClass}
                            onClick={event => this.selectValue(option, event)}
                            // ng-click="vm.selectValue(option, $event)"
                          >
                            <span className="variable-option-icon"></span>
                            <span
                              aria-label={e2e.pages.Dashboard.SubMenu.selectors.submenuItemValueDropDownOptionTexts(
                                `${option.text}`
                              )}
                            >
                              {option.text}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                    {tags.length > 0 && (
                      <div className="variable-options-column">
                        <div className="variable-options-column-header text-center">Tags</div>
                        {tags.map((tag, index) => {
                          return (
                            <a
                              key={`${tag.text}`}
                              className={`${
                                tag.selected ? 'variable-option-tag pointer selected' : 'variable-option-tag pointer'
                              }`}
                              // ng-click="vm.selectTag(tag, $event)"
                            >
                              <span className="fa fa-fw variable-option-icon"></span>
                              <span
                                className="label-tag"
                                // tag-color-from-name="tag.text"
                              >
                                {tag.text}&nbsp;&nbsp;<i className="fa fa-tag"></i>&nbsp;
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ClickOutsideWrapper>
            )}
          </div>
        )}
      </div>
    );
  }
}