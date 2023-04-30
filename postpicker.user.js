// ==UserScript==
// @name         Post picker
// @namespace    https://meta.stackexchange.com/users/289691/rub%c3%a9n
// @version      0.0
// @description  Pick post ids
// @author       Rubén
// @match        https://stackoverflow.com/questions
// @match        https://stackoverflow.com/questions/tagged/*
// @match        https://stackoverflow.com/search?*
// @match        https://stackoverflow.com/users/*?tab=votes*
// @match        https://superuser.com/questions
// @match        https://superuser.com/questions/tagged/*
// @match        https://superuser.com/search?*
// @match        https://superuser.com/users/*?tab=votes*
// @match        https://serverfault.com/questions
// @match        https://serverfault.com/questions/tagged/*
// @match        https://serverfault.com/search?*
// @match        https://serverfault.com/users/*?tab=votes*
// @match        https://askubuntu.com/questions
// @match        https://askubuntu.com/questions/tagged/*
// @match        https://askubuntu.com/search?*
// @match        https://askubuntu.com/users/*?tab=votes*
// @match        https://mathoverflow.com/questions
// @match        https://mathoverflow.com/questions/tagged/*
// @match        https://mathoverflow.com/search?*
// @match        https://mathoverflow.com/users/*?tab=votes*
// @match        https://stackapps.com/questions
// @match        https://stackapps.com/questions/tagged/*
// @match        https://stackapps.com/search?*
// @match        https://stackapps.com/users/*?tab=votes*
// @match        https://meta.stackoverflow.com/questions
// @match        https://meta.stackoverflow.com/questions/tagged/*
// @match        https://meta.stackoverflow.com/search?*
// @match        https://meta.stackoverflow.com/users/*?tab=votes*
// @match        https://meta.superuser.com/questions
// @match        https://meta.superuser.com/questions/tagged/*
// @match        https://meta.superuser.com/search?*
// @match        https://meta.superuser.com/users/*?tab=votes*
// @match        https://meta.serverfault.com/questions
// @match        https://meta.serverfault.com/questions/tagged/*
// @match        https://meta.serverfault.com/search?*
// @match        https://meta.serverfault.com/users/*?tab=votes*
// @match        https://meta.askubuntu.com/questions
// @match        https://meta.askubuntu.com/questions/tagged/*
// @match        https://meta.askubuntu.com/search?*
// @match        https://meta.askubuntu.com/users/*?tab=votes*
// @match        https://meta.mathoverflow.com/questions
// @match        https://meta.mathoverflow.com/questions/tagged/*
// @match        https://meta.mathoverflow.com/search?*
// @match        https://meta.mathoverflow.com/users/*?tab=votes*
// @match        https://*.stackexchange.com
// @match        https://*.stackexchange.com/questions
// @match        https://*.stackexchange.com/questions/tagged/*
// @match        https://*.stackexchange.com/search?*
// @match        https://*.stackexchange.com/users/*?tab=votes*
// @grant        none
// ==/UserScript==

(function(fkey) {
    'use strict';

    // this determines which question to select, available fields are: 'title','questionDate','displayname','protectedDate','answerCount','deletedCount'
    const filter = (i) =>  i.protectedDate < Date.parse('2017-11-01'); // && i.displayname === 'rene';


    // I need the question id, so regex it out of the url
    const parseUserOrQuestionId = /.*(?:\/(?:questions|users)\/(\d+))/g;

    // map each TD to a property of a question object
    function mapRow2Question(tr) {
        // this are the TD elements
        var qitems = tr.children;
        var q = {};
        // map a column to a property, with a few to spare at the end
        var key = ['title','questionDate','displayname','protectedDate','answerCount','deletedCount','qurl','dummy', 'uurl','questionid', 'dummy2', 'userid'];
        for (var j=0; j<qitems.length; j++) {
            var qitem = qitems[j];
            if ( j === 0 || j === 2) {
                // this td contains an anchor element
                // I keep the text and the href in separate properties
                qitem = qitem.children[0];
                // the href hold the id (question or user)
                var m = parseUserOrQuestionId.exec(qitem.href);
                if (m !== null) {
                  // map to the right column
                  q[key[j+9]] = m[1];
                }
                q[key[j+6]] = qitem.href;
                q[key[j]] = qitem.textContent;
            } else if (j === 1 || j === 3)  {
                // these are date columns
                q[key[j]] = Date.parse(qitem.textContent);
            } else {
                // these are integer columns
                q[key[j]] = Number.parseInt(qitem.textContent, 10);
            }
        }
        q.src = tr; // for feedback in the UI
        return q;
    }

    function search(filter) {
        var questions = document.getElementById('content').querySelectorAll('tbody')[0].children;
        var qlist = [],
            selected =[];

        for(var i=0; i<questions.length; i++) {
            qlist.push(mapRow2Question(questions[i]));
        }

        // apply the filter, keep the new array around
        selected = qlist.filter(filter);
        // add checkboxes so you can deselect a question
        selected.forEach( (i) => {
            var qtd = i.src.children[0];
            var cb = document.createElement('input');
            i.selected = true;
            cb.type='checkbox';
            cb.checked ='checked';
            cb.addEventListener('click', function() { i.selected = !i.selected; });
            qtd.insertBefore(cb, qtd.children[0]);
        });
        return selected;
    }

    // clumsy way to add the buttons in the header
    function addButton(txt, handler) {
        var tabs = document.getElementById('tabs');
        var hdr = tabs.parentNode;
        var btn = document.createElement('button');
        btn.addEventListener('click', handler);
        btn.textContent = txt;
        btn.style.margin = "5px";
        hdr.insertBefore(btn, tabs);
        return btn;
    }

    // this will unprotect the question for real
    function unprotect(qid, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/question/unprotect');
        xhr.addEventListener('load', function() {
            if (xhr.status !== 200) {
                console.log('no success for ', qid);
                if (callback) callback();
            }
        });
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        console.log('about to do post /question/unprotect', "id=" + qid.toString() + "&fkey=" + fkey.toString());
        // uncomment the next line to actual call un-protect
        // xhr.send("id=" + qid.toString() + "&fkey=" + fkey.toString());
    }

    // add the buttons and wire the click events
    function init() {
        var timer,
            questionsToUnprotect = [],
            unprotectBtn,
            start;

        start = addButton('search', function() {
            questionsToUnprotect = search(filter);
            unprotectBtn.disabled = false;
            start.disabled = true;
        });
        unprotectBtn = addButton('unprotect', function() {
            unprotectBtn.disabled = true; // we don't want to fire multiple times
            // get all protected questions that are selected
            var work = questionsToUnprotect.filter( (i) => i.selected);
            // to prevent throttle, go over them every 5 seconds
            timer = setInterval(function() {
                var item = work.shift();
                if (item === null || item === undefined) {
                    clearInterval(item);
                    start.disabled = false;
                } else {
                    if (item.selected) {
                      unprotect(item.questionid, function() {
                          // error handling
                          item.src.children[0].style.backgroundColor = 'red';
                          clearInterval(timer); // make sure to stop
                      });
                      item.src.children[0].children[0].checked = false;
                    }
                }
            }, 5000);
        });
        unprotectBtn.disabled = true;
    }

    init();

})(StackExchange.options.user.fkey);
