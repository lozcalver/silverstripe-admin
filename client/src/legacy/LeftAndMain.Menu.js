import $ from 'jquery';
import { joinUrlPaths } from 'lib/urls';

$.entwine('ss', function($){

  /**
   * Vertical CMS menu
   *
   * Example:
   *
   * <ul class="cms-menu__list">
   *  <li><a href="#">Item 1</a></li>
   *  <li class="current opened">
   *  <a href="#">Item 2</a>
   *  </li>
   * </ul>
   *
   * Custom Events:
   * - 'select': Fires when a menu item is selected.
   */
  $('.cms-panel.cms-menu').entwine({

    siteTreePresent: function () {
      return $('#cms-content-tools-CMSMain').length > 0;
    },

    /**
     * @func getPersistedStickyState
     * @return {boolean|undefined} - Returns true if the menu is sticky, false if unsticky. Returns undefined if there is no cookie set.
     * @desc Get the sticky state of the menu according to the cookie.
     */
    getPersistedStickyState: function () {
      var persistedState, cookieValue;

      if ($.cookie !== void 0) {
        cookieValue = $.cookie('cms-menu-sticky');

        if (cookieValue !== void 0 && cookieValue !== null) {
          persistedState = cookieValue === 'true';
        }
      }

      return persistedState;
    },

    /**
     * @func setPersistedStickyState
     * @param {boolean} isSticky - Pass true if you want the panel to be sticky, false for unsticky.
     * @desc Set the collapsed value of the panel, stored in cookies.
     */
    setPersistedStickyState: function (isSticky) {
      if ($.cookie !== void 0) {
        $.cookie('cms-menu-sticky', isSticky, { path: '/', expires: 31 });
      }
    },

    /**
     * @func getEvaluatedCollapsedState
     * @return {boolean} - Returns true if the menu should be collapsed, false if expanded.
     * @desc Evaluate whether the menu should be collapsed.
     *     The basic rule is "If the SiteTree (middle column) is present, collapse the menu, otherwise expand the menu".
     *     This reason behind this is to give the content area more real estate when the SiteTree is present.
     *     The user may wish to override this automatic behaviour and have the menu expanded or collapsed at all times.
     *     So unlike manually toggling the menu, the automatic behaviour never updates the menu's cookie value.
     *     Here we use the manually set state and the automatic behaviour to evaluate what the collapsed state should be.
     */
    getEvaluatedCollapsedState: function () {
      var shouldCollapse,
        manualState = this.getPersistedCollapsedState(),
        menuIsSticky = $('.cms-menu').getPersistedStickyState(),
        automaticState = this.siteTreePresent();

      if (manualState === void 0) {
        // There is no manual state, use automatic state.
        shouldCollapse = automaticState;
      } else if (manualState !== automaticState && menuIsSticky) {
        // The manual and automatic statea conflict, use manual state.
        shouldCollapse = manualState;
      } else {
        // Use automatic state.
        shouldCollapse = automaticState;
      }

      return shouldCollapse;
    },

    onadd: function () {
      var self = this;

      setTimeout(function () {
        // Use a timeout so this happens after the redraw.
        // Triggering a toggle before redraw will result in an incorrect
        // menu 'expanded width' being calculated when then menu
        // is added in a collapsed state.
        self.togglePanel(!self.getEvaluatedCollapsedState(), false, false);
      }, 0);

      // Setup automatic expand / collapse behaviour.
      $(window).on('ajaxComplete', function (e) {
        setTimeout(function () { // Use a timeout so this happens after the redraw
          self.togglePanel(!self.getEvaluatedCollapsedState(), false, false);
        }, 0);
      });

      this._super();
    }
  });

  $('.cms-menu__list').entwine({
    onmatch: function() {
      var self = this;

      // Select default element
      this.find('li.current').select();

      this.updateItems();

      this._super();
    },
    onunmatch: function() {
      this._super();
    },

    updateMenuFromResponse: function(xhr) {
      var controller = xhr.getResponseHeader('X-Controller');
      if(controller) {
        var item = this.find('li#Menu-' + controller.replace(/\\/g, '-').replace(/[^a-zA-Z0-9\-_:.]+/, ''));
        if(!item.hasClass('current')) item.select();
      }
      this.updateItems();
    },

    'from .cms-container': {
      onafterstatechange: function(e, data){
        this.updateMenuFromResponse(data.xhr);
      },
      onaftersubmitform: function(e, data){
        this.updateMenuFromResponse(data.xhr);
      }
    },

    'from .cms-edit-form': {
      onrelodeditform: function(e, data){
        this.updateMenuFromResponse(data.xmlhttp);
      }
    },

    getContainingPanel: function(){
      return this.closest('.cms-panel');
    },

    fromContainingPanel: {
      ontoggle: function(e){
        this.toggleClass('collapsed', $(e.target).hasClass('collapsed'));

        // Trigger synthetic resize event. Avoid native window.resize event
        // since it causes other behaviour which should be reserved for actual window dimension changes.
        $('.cms-container').trigger('windowresize');
      }
    },

    updateItems: function() {
      // Hide "edit page" commands unless the section is activated
      var editPageItem = this.find('#Menu-CMSMain');

      editPageItem[editPageItem.is('.current') ? 'show' : 'hide']();

      // Update the menu links to reflect the page ID if the page has changed the URL.
      var currentID = $('.cms-content input[name=ID]').val();
      if(currentID) {
        this.find('li').each(function() {
          if(typeof $(this).setRecordID === 'function') $(this).setRecordID(currentID);
        });
      }
    }
  });

  $('.cms-menu__list *').entwine({
    getMenu: function() {
      return this.parents('.cms-menu__list:first');
    }
  });

  $('.cms-menu__list li *').entwine({
    getMenuItem: function() {
      return this.parents('li:first');
    }
  });

  /**
   * Both primary and secondary nav.
   */
  $('.cms-menu__list li a').entwine({
    onclick: function(e) {
      // Only catch left clicks, in order to allow opening in tabs.
      // Ignore external links, fallback to standard link behaviour
      var isExternal = $.path.isExternal(this.attr('href'));
      if(e.which > 1 || isExternal) return;

      // if the developer has this to open in a new window, handle
      // that
      if(this.attr('target') == "_blank") {
        return;
      }

      e.preventDefault();

      var item = this.getMenuItem();

      var url = this.attr('href');
      if(!isExternal) url = joinUrlPaths($('base').attr('href'), url);
      document.location.href = url;

      item.select();
    }
  });

  $('.cms .profile-link').entwine({
    onclick: function() {
      $('.cms-container').loadPanel(this.attr('href'));
      $('.cms-menu__list li').removeClass('current').close();
      return false;
    }
  });

  /**
   * Toggles the manual override of the left menu's automatic expand / collapse behaviour.
   */
  $('.cms-menu .sticky-toggle__button').entwine({

    onadd: function () {
      var isSticky = $('.cms-menu').getPersistedStickyState() ? true : false;

      this.toggleCSS(isSticky);
      this.toggleIndicator(isSticky);

      this._super();
    },

    /**
     * @func toggleCSS
     * @param {boolean} isSticky - The current state of the menu.
     * @desc Toggles the 'active' CSS class of the element.
     */
    toggleCSS: function (isSticky) {
      this[isSticky ? 'addClass' : 'removeClass']('active');
    },

    /**
     * @func toggleIndicator
     * @param {boolean} isSticky - The current state of the menu.
     * @desc Updates the indicator's text based on the sticky state of the menu.
     */
    toggleIndicator: function (isSticky) {
      this.next('.sticky-toggle__status').text(isSticky ? 'fixed' : 'auto');
    },

    onclick: function () {
      var $menu = this.closest('.cms-menu'),
        persistedCollapsedState = $menu.getPersistedCollapsedState(),
        persistedStickyState = $menu.getPersistedStickyState(),
        newStickyState = persistedStickyState === void 0 ? !this.hasClass('active') : !persistedStickyState;

      // Update the persisted collapsed state
      if (persistedCollapsedState === void 0) {
        // If there is no persisted menu state currently set, then set it to the menu's current state.
        // This will be the case if the user has never manually expanded or collapsed the menu,
        // or the menu has previously been made unsticky.
        $menu.setPersistedCollapsedState($menu.hasClass('collapsed'));
      } else if (persistedCollapsedState !== void 0 && newStickyState === false) {
        // If there is a persisted state and the menu has been made unsticky, remove the persisted state.
        $menu.clearPersistedCollapsedState();
      }

      // Persist the sticky state of the menu
      $menu.setPersistedStickyState(newStickyState);

      this.toggleCSS(newStickyState);
      this.toggleIndicator(newStickyState);

      this._super();
    }
  });

  $('.cms-help__menu').entwine({
    onclick: function () {
      var expandedState = (this.attr('aria-expanded') === 'true');

      this.attr('aria-expanded', !expandedState);
      $('.cms-help__toggle').toggleClass('cms-help__toggle--show')
    }
  });
});
