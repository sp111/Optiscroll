var Scrollbar = function (which, instance) {

  var isVertical = (which === 'v'),
      parentEl = instance.element,
      scrollEl = instance.scrollEl,
      settings = instance.settings,
      cache = instance.cache,
      scrollbarCache = cache[which] = {},

      sizeProp = isVertical ? 'H' : 'W',
      clientSize = 'client'+sizeProp,
      scrollSize = 'scroll'+sizeProp,
      scrollProp = isVertical ? 'scrollTop' : 'scrollLeft',
      evNames = isVertical ? ['top','bottom'] : ['left','right'],
      trackTransition = 'height 0.2s ease 0s, width 0.2s ease 0s, opacity 0.2s ease 0s',

      enabled = false,
      scrollbarEl = null,
      trackEl = null,
      dragData = null,
      animated = false;

  var events = {
    dragData: null,

    dragStart: function (ev) {
      var evData = ev.touches ? ev.touches[0] : ev;
      events.dragData = { x: evData.pageX, y: evData.pageY, scroll: scrollEl[scrollProp] };
    },

    dragMove: function (ev) {
      var evData = ev.touches ? ev.touches[0] : ev,
          delta, deltaRatio;
      
      if(!events.dragData) { return; }

      ev.preventDefault();
      delta = isVertical ? evData.pageY - events.dragData.y : evData.pageX - events.dragData.x;
      deltaRatio = delta / cache[clientSize];
      
      scrollEl[scrollProp] = events.dragData.scroll + deltaRatio * cache[scrollSize];
    },

    dragEnd: function (ev) {
      events.dragData = null;
    }
  }
  
  return {


    toggle: function (bool) {
      enabled = bool;

      if(trackEl) {
        toggleClass(parentEl, which+'track-on', enabled);

        if(enabled) {
          trackEl.style[G.cssTransition] = trackTransition;
        }
      }

      // expose enabled
      scrollbarCache.enabled = enabled;
    },


    create: function () {
      scrollbarEl = document.createElement('div');
      trackEl = document.createElement('b');

      scrollbarEl.className = settings.classPrefix+'-'+which;
      trackEl.className = settings.classPrefix+'-'+which+'track';
      scrollbarEl.appendChild(trackEl);
      parentEl.appendChild(scrollbarEl);

      if(settings.draggableTracks) {
        this.bind(true);
      }
    },


    update: function (isOnTouch) {
      var me = this,
          newDim, newRelPos, deltaPos;

      // if scrollbar is disabled and no scroll
      if(!enabled && cache[clientSize] === cache[scrollSize]) {
        return;
      }

      newDim = this.calc();
      newRelPos = ((1 / newDim.size) * newDim.position * 100);
      deltaPos = Math.abs(newDim.position - (scrollbarCache.position || 0)) * cache[clientSize];

      if(newDim.size === 1 && enabled) {
        me.toggle(false);
      }

      if(newDim.size < 1 && !enabled) {
        me.toggle(true);
      }

      if(trackEl && enabled) {
        if(scrollbarCache.size !== newDim.size) {
          trackEl.style[ isVertical ? 'height':'width' ] = newDim.size * 100 + '%';
        }

        if(deltaPos) { // only if position has changed
          me.animateTrack( G.isTouch && deltaPos > 20 );
          trackEl.style[G.cssTransform] = 'translate(' + (isVertical ?  '0%,'+newRelPos+'%' : newRelPos+'%'+',0%') +')';
        }
      }

      // update cache values
      scrollbarCache = _extend(scrollbarCache, newDim);

      if(enabled && !isOnTouch) {
        me.fireEdgeEv();
      }
      
    },


    animateTrack: function (animatePos) {
      if(animatePos || animated) {
        trackEl.style[G.cssTransition] = trackTransition + (animatePos ? ', '+ G.cssTransformDashed + ' 0.2s linear 0s' : '');
      }
      animated = animatePos;
    },


    bind: function (on) {
      var method = (on ? 'add' : 'remove') + 'EventListener',
          type = G.isTouch ? ['touchstart', 'touchmove', 'touchend'] : ['mousedown', 'mousemove', 'mouseup'];

      if (trackEl) { trackEl[method](type[0], events.dragStart); }
      document[method](type[1], events.dragMove);
      document[method](type[2], events.dragEnd);
      
    },


    calc: function () {
      var position = scrollEl[scrollProp],
          viewS = cache[clientSize], 
          scrollS = cache[scrollSize], 
          minTrackR = settings.minTrackSize / 100,
          maxTrackR = settings.maxTrackSize / 100,
          sizeRatio, positionRatio, percent;

      sizeRatio = viewS / scrollS;

      if(sizeRatio === 1 || scrollS === 0) { // no scrollbars needed
        return { position: 0, size: 1, percent: 0 };
      }

      positionRatio = position / scrollS;
      percent = 100 * position / (scrollS - viewS);

      if( sizeRatio > maxTrackR ) {
        positionRatio += (sizeRatio - maxTrackR) * (percent / 100);
        sizeRatio = maxTrackR;
      }

      if( sizeRatio < minTrackR ) {
        positionRatio += (sizeRatio - minTrackR) * (percent / 100);
        sizeRatio = minTrackR;
      }

      if(percent < 0) { // overscroll
        positionRatio = 0;
      }

      if(percent > 100) { // overscroll
        positionRatio = 1 - sizeRatio;
      }
      
      return { position: positionRatio, size: sizeRatio, percent: percent };
    },


    fireEdgeEv: function () {
      var percent = scrollbarCache.percent;

      if(scrollbarCache.was !== percent && percent % 100 === 0) {
        instance.fireCustomEvent('scrollreachedge');
        instance.fireCustomEvent('scrollreach'+ evNames[percent/100] );
      }

      scrollbarCache.was = percent;
    },


    remove: function () {
      // remove parent custom classes
      this.toggle(false);
      // unbind drag events
      this.bind(false);
      // remove elements
      if(scrollbarEl && scrollbarEl.parentNode) {
        scrollbarEl.parentNode.removeChild(scrollbarEl);
      }
    }


  };

};