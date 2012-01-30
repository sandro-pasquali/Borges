"use strict";

(function() {

var BINDING = {
	original 	: [],
	active		: []
};

var ORIGINAL 	= BINDING.original;
var ACTIVE		= BINDING.active;

var PAGINATION	= 0;
var CUR_PAGE	= 1;

//  A library of common methods
//  
var $$ = {
    isArray     : function(a) {
        return Object.prototype.toString.call(a) === '[object Array]';
    },
    argsToArray : function(a, offset, end) {
        return Array.prototype.slice.call(a, offset || 0, end);
    },
    copy        : function(s) {
        return this.isArray(s) ? s.slice(0) : s;
    }
};

//	These list methods only return a value if their operation is non-destructive.
//	The current operating list is passed by reference, and as such does not need
//	to be returned.
//
var METHODS = {

    //  Return item at sent index.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  @argumentList
    //      0: {Number}     The index.
    //
    get     : function(cur, a, len) {
        return cur[a[0] >= 0 ? a[0] : len + a[0]];
    },
    //  Fetch item at sent index.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  NOTE: There is no range checking done.
    //
    //  @argumentList
    //      0: {Number}     The index.
    //      1: {Mixed}      The value to set
    //
    set     : function(cur, a, len) {
        return (cur[a[0] >= 0 ? a[0] : len + a[0]] = a[1]);
    },
    //  Insert item before or after another item value.
    //
    //  @argumentList
    //      0:  {String}    One of "before" or "after".
    //      1:  {Mixed}     The pivot value.
    //      n:  {Mixed}     Any number of arguments (items) to be inserted
    //                      before or after given pivot value.
    //
    insert  : function(cur, a, len) {
        var ins = a.slice(2);
        var piv = 1;

        while(len--) {
            if(cur[len] === a[1]) {

                if(a[0] == "before") {
                    piv = -piv;
                }

                [].splice.apply(cur, [len + piv, 0].concat(ins));
                break;
            }
        }
        
        return cur;
    },
    //  Returns the length of the list
    //
    size   	: function(cur, a, len) {
        return len;
    },
    //  Regarding the first item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    first   : function(cur, a) {
    	var c = a.length;
        if(c) {
        	while(c--) {
        		cur.unshift(a[c]);
        	}
        } else {
        	return cur.slice(0,1);
        }

        return cur;
    },
    //  Regarding the first item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value.
    //
    //  Unlike #first, #firstx will *not* create a list if one does not exist.
    //
    firstx  : function(cur, a) {
        return cur ? this.first(cur, a) : null;
    },
    //  Regarding the last item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    last     : function(cur, a, len) {
    	var c 	= a.length;
    	var i	= 0;
        if(c) {
        	for(; i < c; i++) {
        		cur.push(a[i]);
        	}
        } else {
        	return cur.slice(len -2, 1);
        }

        return cur;
    },
    //  Regarding the last item, either fetch it by sending zero arguments,
    //  or set it by sending a single item value. If the list does not
    //  exist, a new list will be created.
    //
    //  Unlike #last, #lastx will *not* create a list if one does not exist.
    //
    lastx   : function(cur, a) {
        return cur ? this.last(cur, a) : null;
    },
    //  Returns a range of elements.
    //
    //  Indexes can be positive or negative, and are zero based.
    //  `0` is first item, `1` is second, `-1` is last, `-2` is penultimate.
    //  NOTE: There is no range checking done.
    //
    //  @argumentList
    //      0:      {Number} Start index.
    //      [1]:    {Number} End index. If none sent, range is start->list end.
    //
    range   : function(cur, a, len) {
    	var v 	= [	a[0] >= 0
    				? a[0]
    				: len + a[0] ,
    				a[1]
    				? a[1] >= 0
    					? a[1]
    					: len + a[1]
    				: len].sort();

        return cur.slice(v[0], v[1]);
    },
    remove  : function(cur, a, len) {
        var max     = a[0] === 0 ? len : Math.abs(a[0]);
        var pos     = a[0] > 0;
        var hits    = [];
        var hLen    = 0;
        var cLen    = len;

        while(cLen--) {
            if(cur[cLen] === a[1]) {
                hLen = hits.push(cLen);
                if(!pos && hLen === max) {
                    break;
                }
            }
        }

        //  Sort and truncate. If negative (from right), there will be no effect,
        //  as the length of hits is controlled in above loop. If positive (or zero)
        //  will be sorted smaller->larger, and truncated to #max length.
        //
        hits.sort();
        hLen 		= Math.min(hits.length, max);
        hits.length = hLen;

        while(hLen--) {
            cur.splice(hits[hLen], 1);
        }
        
        return cur;
    },
    //	Unique-ifys the #active list.
    //
    unique  	: function(cur, a, len) {
		var board = {};
		var r = [];

		while(len--) {
			if(!board[cur[len]]) {
				r.unshift(cur[len]);
				board[cur[len]] = true;
			}
		}

		cur = r;
		
		return cur;
    },
    //	Shuffle a list randomly.
    //
    //	Implements Fisher-Yates algorithm.
    //	@see	http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    //
    shuffle		: function(cur, a, len) {
		var s;
		var r;

		while(len) {
			// Select one of the remaining and swap with current.
			//
			r = Math.floor(Math.random() * (len - 1));
			s = cur[--len];
			cur[len] = cur[r];
			cur[r] = s;
		}
		
		return cur;
    },
    //  ##compose
    //
    //  Returns the composed result of a list of functions processed tail to head.
    //  Expects a single argument, which is the value to pass to the tail function.
    //  NOTE that no checking is done of list member types. If any member is not a 
    //  function this will error.
    //
    compose		: function(cur, a, len) {
    	var last = a;
    	while(len--) {
    		last = cur[len].apply(this, last);
    	}

    	return last;
    },
    //  ##sequence
    //
    //  Returns the composed result of a list of functions processed head to tail.
    //  Expects a single argument, which is the value to pass to the head function.
    //  NOTE that no checking is done of list member types. If any member is not a 
    //  function this will error.
    //
    sequence	: function(cur, a, len) {
    	var last    = a;
    	var i       = 0
    	while(i < len) {
    		last = cur[len].apply(this, last);
    		i++;
    	}

    	return last;
    },
    //	Will replace the #original list with the current #active list.
    //
    commit	: function(cur, a, len, key) {
    	ORIGINAL[key] = $$.copy(ACTIVE[key]);
    },
    //	Will replace the #active list with the #original list.
    //
    reset	: function(cur, a, len, key) {
    	ACTIVE[key] = $$.copy(ORIGINAL[key]);
    },
    //	Will remove a key (a list) entirely.
    //
    unset	: function(cur, a, len, key) {
        delete ACTIVE[key];
    	delete ORIGINAL[key];
    },

    //	Create a basic iterator for a list.
    //
    //	To fetch iterator for #ACTIVE list, send no arguments.
    //	To fetch iterator for #ORIGINAL list, send argument {String} "original".
    //	To fetch iterator for any given array, send nothing, not even a key.
    //
    iterator	: function(cur, a, len, key) {

    	return new function() {
    		var list = 	$$.copy(	$$.isArray(key)
							? key
							: a[0] === "original"
								? ORIGINAL[key]
								: ACTIVE[key], 1);

    		this.idx		= -1;
    		this.moveIdx	= function(d) {
    			var i	= this.idx + d;
    			var len = list.length -1;
    			this.idx =	i < 0
							? len
							: i > len
								? 0
								: i;
				return this.idx;
    		};
    		this.next	= function() {
    			return list[this.moveIdx(1)];
    		};
    		this.prev	= function() {
    			return list[this.moveIdx(-1)];
    		};
    		this.nextIndex	= function() {
    			return this.moveIdx(1);
    		};
    		this.prevIndex	= function() {
    			return this.moveIdx(-1);
    		};
    		this.hasNext	= function() {
    			return !((this.idx + 1) === list.length)
    		};
    		this.hasPrev	= function() {
    			return !((this.idx - 1) === 0)
    		};
    		this.remove		= function() {
    			var s = list.splice(this.idx, 1);
    			if(list.length === this.idx) {
    				this.prev();
    			}
    			return s;
    		};
    		this.set	= function() {
    			list[this.idx] = key;
    			return a[0];
    		}
    	};
    },

    paginate	: function(cur, a, len) {
    	PAGINATION = Math.max(0, a[0]);
    },

	//	##page
	//
	//	Returns the requested page array if #a is set, or the current page # if not.
	//
	//	@example	Terrace.lists.page(3) // [
    page	: function(cur, a, len) {

    	var p 		= a[0];
    	var pages 	= Math.ceil((len -1) / PAGINATION);
    	var start;
    	var end;

		//	If #p is positive or negative the request is for a page array so run block.
		//	If undefined, requesting #CUR_PAGE. Skip.
		//	If 0(zero), treat like undefined.
		//
    	if(p) {
			if(p < 0) {
				p = Math.max(pages + p +1, 1);
			} else {
				p = Math.min(p, pages);
			}

			start 	= Math.min((p-1) * PAGINATION, len);
			end		= Math.min(start + PAGINATION, len);

			CUR_PAGE = p;
			return cur.slice(start, end);
    	}
    	return CUR_PAGE;
    },

    totalPages	: function(cur, a, len) {
    	return Math.ceil(len / PAGINATION);
    }
}

//  Prefilter for list calls, mainly to validate arguments and set up boilerplate for
//  the list accessors to use.
//
//  Ensures that execution terminates if requested method cannot work with the
//  current list, determines current list values, filters argument list, and calls method.
//
var LIST_ACCESSOR = function(m, key) {
    var a   	= $$.argsToArray(arguments, 2);
	var cur 	= ACTIVE[key];
	var initial	= false;
	var result;

    //  There is no value set.
    //
    if(!cur) {
        if($$.isArray(key)) {
            cur = key;
        } else if(a[0] !== void 0 && (m == "first" || m == "last")) {
        	cur = ACTIVE[key] = [];
            initial = true;
		} else if(m === "iterator") {
			cur = [];
        }  else {
            return null;
        }
    }

	//	Run transformation on #active list.
	//
    result = METHODS[m](cur, a, cur.length, key);

	//	If first list operation on this key, store *copy* of #active.  NOTE that the
	//	copy is shallow, which means that objects are not copied. Being in a list
	//	doesn't insulate list members from external access which may, or may not, be
	//	what you want.
	//
	if(initial) {
		ORIGINAL[key] = $$.copy(cur,1);
	}

   	return result || cur;
};

var LIST_M = [
    "insert",
    "size",
    "first",
    "firstx",
    "last",
    "lastx",
    "range",
    "remove",
    "unique",
    "shuffle",
    "compose",
    "sequence",
    "get",
    "set",
    "commit",
    "reset",
    "unset",
    "filter",
    "iterator",
    "paginate",
    "page",
    "totalPages"
];

var KIT = {};

while(LIST_M.length) {
	(function(m) {
        KIT[m] = function() {
    
            //	Methods have varying functional signatures.
            //
            var a = $$.argsToArray(arguments);

            //	#LIST_ACCESSOR expects method name as first argument.
            //
            a.unshift(m);
    
            return LIST_ACCESSOR.apply(KIT, a);
        };
    })(LIST_M.pop());
}

if(typeof exports == 'object' && exports) {
    exports.borges = KIT;
} else {
    window.borges = KIT;
}

})();