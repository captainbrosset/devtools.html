/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global PromisesPanel */

"use strict";

var { utils: Cu } = Components;
const { loader } = require("devtools/shared/Loader");

const { Task } = require("devtools/sham/task");

const { promise } = require("devtools/sham/promise");
const EventEmitter = require("devtools/shared/event-emitter");
const DevToolsUtils = require("devtools/shared/DevToolsUtils");
const { PromisesFront } = require("devtools/server/actors/promises");

// Global toolbox, set when startup is called.
var gToolbox;

/**
 * Initialize the promise debugger controller and view upon loading the iframe.
 */
var startup = Task.async(function*(toolbox) {
  gToolbox = toolbox;

  yield PromisesController.initialize(toolbox);
  yield PromisesPanel.initialize();
});

/**
 * Destroy the promise debugger controller and view when unloading the iframe.
 */
var shutdown = Task.async(function*() {
  yield PromisesController.destroy();
  yield PromisesPanel.destroy();

  gToolbox = null;
});

function setPanel(toolbox) {
  return startup(toolbox).catch(e =>
    DevToolsUtils.reportException("setPanel", e));
}

function destroy() {
  return shutdown().catch(e => DevToolsUtils.reportException("destroy", e));
}

/**
 * The promisedebugger controller's job is to retrieve PromisesFronts from the
 * server.
 */
var PromisesController = {
  initialize: Task.async(function*() {
    if (this.initialized) {
      return this.initialized.promise;
    }

    this.initialized = promise.defer();

    let target = gToolbox.target;
    this.promisesFront = new PromisesFront(target.client, target.form);
    yield this.promisesFront.attach();

    if (this.destroyed) {
      console.warn("Could not fully initialize the PromisesController");
      return null;
    }

    this.initialized.resolve();
  }),

  destroy: Task.async(function*() {
    if (!this.initialized) {
      return null;
    }

    if (this.destroyed) {
      return this.destroyed.promise;
    }

    this.destroyed = promise.defer();

    if (this.promisesFront) {
      yield this.promisesFront.detach();
      this.promisesFront.destroy();
      this.promisesFront = null;
    }

    this.destroyed.resolve();
  }),
};

EventEmitter.decorate(PromisesController);
