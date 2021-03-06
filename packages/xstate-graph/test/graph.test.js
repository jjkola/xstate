"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var chai_1 = require("chai");
var xstate_1 = require("xstate");
var index_1 = require("../src/index");
var graph_1 = require("../src/graph");
var xstate_2 = require("xstate");
// tslint:disable-next-line:no-var-requires
// import * as util from 'util';
describe('graph utilities', function () {
    var pedestrianStates = {
        initial: 'walk',
        states: {
            walk: {
                on: {
                    PED_COUNTDOWN: {
                        target: 'wait',
                        actions: ['startCountdown']
                    }
                }
            },
            wait: {
                on: {
                    PED_COUNTDOWN: 'stop'
                }
            },
            stop: {},
            flashing: {}
        }
    };
    var lightMachine = xstate_1.Machine({
        key: 'light',
        initial: 'green',
        states: {
            green: {
                on: {
                    TIMER: 'yellow',
                    POWER_OUTAGE: 'red.flashing',
                    PUSH_BUTTON: [
                        {
                            actions: ['doNothing'] // pushing the walk button never does anything
                        }
                    ]
                }
            },
            yellow: {
                on: {
                    TIMER: 'red',
                    POWER_OUTAGE: '#light.red.flashing'
                }
            },
            red: __assign({ on: {
                    TIMER: 'green',
                    POWER_OUTAGE: 'red.flashing'
                } }, pedestrianStates)
        }
    });
    var condMachine = xstate_1.Machine({
        key: 'cond',
        initial: 'pending',
        states: {
            pending: {
                on: {
                    EVENT: [
                        { target: 'foo', cond: function (_, e) { return e.id === 'foo'; } },
                        { target: 'bar' }
                    ],
                    STATE: [
                        { target: 'foo', cond: function (s) { return s.id === 'foo'; } },
                        { target: 'bar' }
                    ]
                }
            },
            foo: {},
            bar: {}
        }
    });
    var parallelMachine = xstate_1.Machine({
        type: 'parallel',
        key: 'p',
        states: {
            a: {
                initial: 'a1',
                states: {
                    a1: {
                        on: { 2: 'a2', 3: 'a3' }
                    },
                    a2: {
                        on: { 3: 'a3', 1: 'a1' }
                    },
                    a3: {}
                }
            },
            b: {
                initial: 'b1',
                states: {
                    b1: {
                        on: { 2: 'b2', 3: 'b3' }
                    },
                    b2: {
                        on: { 3: 'b3', 1: 'b1' }
                    },
                    b3: {}
                }
            }
        }
    });
    describe('getNodes()', function () {
        it('should return an array of all nodes', function () {
            var nodes = index_1.getNodes(lightMachine);
            chai_1.assert.ok(nodes.every(function (node) { return node instanceof xstate_1.StateNode; }));
            chai_1.assert.sameMembers(nodes.map(function (node) { return node.id; }), [
                'light.green',
                'light.yellow',
                'light.red',
                'light.red.walk',
                'light.red.wait',
                'light.red.stop',
                'light.red.flashing'
            ]);
        });
        it('should return an array of all nodes (parallel)', function () {
            var nodes = index_1.getNodes(parallelMachine);
            chai_1.assert.ok(nodes.every(function (node) { return node instanceof xstate_1.StateNode; }));
            chai_1.assert.sameMembers(nodes.map(function (node) { return node.id; }), [
                'p.a',
                'p.a.a1',
                'p.a.a2',
                'p.a.a3',
                'p.b',
                'p.b.b1',
                'p.b.b2',
                'p.b.b3'
            ]);
        });
    });
    describe('getEdges()', function () {
        it('should return an array of all directed edges', function () {
            var edges = graph_1.getEdges(lightMachine);
            chai_1.assert.ok(edges.every(function (edge) {
                return (typeof edge.event === 'string' &&
                    edge.source instanceof xstate_1.StateNode &&
                    edge.target instanceof xstate_1.StateNode);
            }));
            chai_1.assert.sameDeepMembers(edges.map(function (edge) { return ({
                event: edge.event,
                source: edge.source.id,
                target: edge.target.id,
                actions: edge.actions
            }); }), [
                {
                    event: 'PUSH_BUTTON',
                    source: 'light.green',
                    target: 'light.green',
                    actions: ['doNothing'] // lol
                },
                {
                    event: 'TIMER',
                    source: 'light.green',
                    target: 'light.yellow',
                    actions: []
                },
                {
                    event: 'TIMER',
                    source: 'light.yellow',
                    target: 'light.red',
                    actions: []
                },
                {
                    event: 'PED_COUNTDOWN',
                    source: 'light.red.walk',
                    target: 'light.red.wait',
                    actions: ['startCountdown']
                },
                {
                    event: 'PED_COUNTDOWN',
                    source: 'light.red.wait',
                    target: 'light.red.stop',
                    actions: []
                },
                {
                    event: 'TIMER',
                    source: 'light.red',
                    target: 'light.green',
                    actions: []
                },
                {
                    event: 'POWER_OUTAGE',
                    source: 'light.red',
                    target: 'light.red.flashing',
                    actions: []
                },
                {
                    event: 'POWER_OUTAGE',
                    source: 'light.yellow',
                    target: 'light.red.flashing',
                    actions: []
                },
                {
                    event: 'POWER_OUTAGE',
                    source: 'light.green',
                    target: 'light.red.flashing',
                    actions: []
                }
            ]);
        });
        it('should return an array of all directed edges (parallel)', function () {
            var edges = graph_1.getEdges(parallelMachine);
            chai_1.assert.ok(edges.every(function (edge) {
                return (typeof edge.event === 'string' &&
                    edge.source instanceof xstate_1.StateNode &&
                    edge.target instanceof xstate_1.StateNode);
            }));
            chai_1.assert.sameDeepMembers(edges.map(function (edge) { return ({
                event: edge.event,
                source: edge.source.id,
                target: edge.target.id
            }); }), [
                { event: '2', source: 'p.a.a1', target: 'p.a.a2' },
                { event: '1', source: 'p.a.a2', target: 'p.a.a1' },
                { event: '3', source: 'p.a.a2', target: 'p.a.a3' },
                { event: '3', source: 'p.a.a1', target: 'p.a.a3' },
                { event: '2', source: 'p.b.b1', target: 'p.b.b2' },
                { event: '1', source: 'p.b.b2', target: 'p.b.b1' },
                { event: '3', source: 'p.b.b2', target: 'p.b.b3' },
                { event: '3', source: 'p.b.b1', target: 'p.b.b3' }
            ]);
        });
    });
    describe('getAdjacencyMap()', function () {
        it('should return a flattened adjacency map', function () {
            chai_1.assert.deepEqual(index_1.getAdjacencyMap(lightMachine), {
                '"green"': {
                    TIMER: { state: 'yellow' },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: 'green' },
                    PUSH_BUTTON: { state: 'green' }
                },
                '"yellow"': {
                    TIMER: { state: { red: 'walk' } },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: 'yellow' },
                    PUSH_BUTTON: { state: 'yellow' }
                },
                '{"red":"walk"}': {
                    TIMER: { state: 'green' },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: { red: 'wait' } },
                    PUSH_BUTTON: { state: { red: 'walk' } }
                },
                '{"red":"flashing"}': {
                    TIMER: { state: 'green' },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: { red: 'flashing' } },
                    PUSH_BUTTON: { state: { red: 'flashing' } }
                },
                '{"red":"wait"}': {
                    TIMER: { state: 'green' },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: { red: 'stop' } },
                    PUSH_BUTTON: { state: { red: 'wait' } }
                },
                '{"red":"stop"}': {
                    TIMER: { state: 'green' },
                    POWER_OUTAGE: { state: { red: 'flashing' } },
                    PED_COUNTDOWN: { state: { red: 'stop' } },
                    PUSH_BUTTON: { state: { red: 'stop' } }
                }
            });
        });
        it('should return a flattened adjacency map (parallel)', function () {
            chai_1.assert.deepEqual(index_1.getAdjacencyMap(parallelMachine), {
                '{"a":"a1","b":"b1"}': {
                    '1': { state: { a: 'a1', b: 'b1' } },
                    '2': { state: { a: 'a2', b: 'b2' } },
                    '3': { state: { a: 'a3', b: 'b3' } }
                },
                '{"a":"a2","b":"b2"}': {
                    '1': { state: { a: 'a1', b: 'b1' } },
                    '2': { state: { a: 'a2', b: 'b2' } },
                    '3': { state: { a: 'a3', b: 'b3' } }
                },
                '{"a":"a3","b":"b3"}': {
                    '1': { state: { a: 'a3', b: 'b3' } },
                    '2': { state: { a: 'a3', b: 'b3' } },
                    '3': { state: { a: 'a3', b: 'b3' } }
                }
            });
        });
    });
    xdescribe('getShortestValuePaths()', function () {
        it('should return a mapping of shortest paths to all states', function () {
            chai_1.assert.deepEqual(graph_1.getShortestValuePaths(lightMachine), {
                '"green"': [],
                '"yellow"': [
                    {
                        state: { context: undefined, value: 'green' },
                        event: { type: 'TIMER' }
                    }
                ],
                '{"red":"flashing"}': [
                    {
                        state: { context: undefined, value: 'green' },
                        event: { type: 'POWER_OUTAGE' }
                    }
                ],
                '{"red":"walk"}': [
                    {
                        state: { context: undefined, value: 'green' },
                        event: { type: 'TIMER' }
                    },
                    {
                        state: { context: undefined, value: 'yellow' },
                        event: { type: 'TIMER' }
                    }
                ],
                '{"red":"wait"}': [
                    {
                        state: { context: undefined, value: 'green' },
                        event: { type: 'TIMER' }
                    },
                    {
                        state: { context: undefined, value: 'yellow' },
                        event: { type: 'TIMER' }
                    },
                    {
                        state: { context: undefined, value: { red: 'walk' } },
                        event: { type: 'PED_COUNTDOWN' }
                    }
                ],
                '{"red":"stop"}': [
                    {
                        state: { context: undefined, value: 'green' },
                        event: { type: 'TIMER' }
                    },
                    {
                        state: { context: undefined, value: 'yellow' },
                        event: { type: 'TIMER' }
                    },
                    {
                        state: { context: undefined, value: { red: 'walk' } },
                        event: { type: 'PED_COUNTDOWN' }
                    },
                    {
                        state: { context: undefined, value: { red: 'wait' } },
                        event: { type: 'PED_COUNTDOWN' }
                    }
                ]
            });
        });
        it('should return a mapping of shortest paths to all states (parallel)', function () {
            chai_1.assert.deepEqual(graph_1.getShortestValuePaths(parallelMachine), {
                '{"a":"a1","b":"b1"}': [],
                '{"a":"a2","b":"b2"}': [
                    {
                        event: { type: '2' },
                        state: {
                            context: undefined,
                            value: {
                                a: 'a1',
                                b: 'b1'
                            }
                        }
                    }
                ],
                '{"a":"a3","b":"b3"}': [
                    {
                        event: { type: '3' },
                        state: {
                            context: undefined,
                            value: {
                                a: 'a1',
                                b: 'b1'
                            }
                        }
                    }
                ]
            });
        });
        it('the initial state should have a zero-length path', function () {
            chai_1.assert.lengthOf(graph_1.getShortestValuePaths(lightMachine)[JSON.stringify(lightMachine.initialState.value)], 0);
        });
        it('should not throw when a condition is present', function () {
            chai_1.assert.doesNotThrow(function () { return graph_1.getShortestValuePaths(condMachine); });
        });
        it('should represent conditional paths based on context', function () {
            chai_1.assert.deepEqual(graph_1.getShortestValuePaths(condMachine.withContext({ id: 'foo' })), {
                '"bar"': [
                    {
                        event: { type: 'EVENT', id: 'whatever' },
                        state: { context: { id: 'foo' }, value: 'pending' }
                    }
                ],
                '"foo"': [
                    {
                        event: { type: 'STATE' },
                        state: { context: { id: 'foo' }, value: 'pending' }
                    }
                ],
                '"pending"': []
            });
        });
    });
    xdescribe('getShortestValuePathsAsArray()', function () {
        it('should return an array of shortest paths to all states', function () {
            chai_1.assert.deepEqual(graph_1.getShortestPathsAsArray(lightMachine), [
                { state: { value: 'green', context: undefined }, path: [] },
                {
                    state: { value: 'yellow', context: undefined },
                    path: [
                        {
                            state: { context: undefined, value: 'green' },
                            event: { type: 'TIMER' }
                        }
                    ]
                },
                {
                    state: { value: { red: 'flashing' }, context: undefined },
                    path: [
                        {
                            state: { context: undefined, value: 'green' },
                            event: { type: 'POWER_OUTAGE' }
                        }
                    ]
                },
                {
                    state: { value: { red: 'walk' }, context: undefined },
                    path: [
                        {
                            state: { context: undefined, value: 'green' },
                            event: { type: 'TIMER' }
                        },
                        {
                            state: { context: undefined, value: 'yellow' },
                            event: { type: 'TIMER' }
                        }
                    ]
                },
                {
                    state: { value: { red: 'wait' }, context: undefined },
                    path: [
                        {
                            state: { context: undefined, value: 'green' },
                            event: { type: 'TIMER' }
                        },
                        {
                            state: { context: undefined, value: 'yellow' },
                            event: { type: 'TIMER' }
                        },
                        {
                            state: { context: undefined, value: { red: 'walk' } },
                            event: { type: 'PED_COUNTDOWN' }
                        }
                    ]
                },
                {
                    state: { value: { red: 'stop' }, context: undefined },
                    path: [
                        {
                            state: { context: undefined, value: 'green' },
                            event: { type: 'TIMER' }
                        },
                        {
                            state: { context: undefined, value: 'yellow' },
                            event: { type: 'TIMER' }
                        },
                        {
                            state: { context: undefined, value: { red: 'walk' } },
                            event: { type: 'PED_COUNTDOWN' }
                        },
                        {
                            state: { context: undefined, value: { red: 'wait' } },
                            event: { type: 'PED_COUNTDOWN' }
                        }
                    ]
                }
            ]);
        });
    });
    describe('getSimplePaths()', function () {
        it('should return a mapping of arrays of simple paths to all states', function () {
            chai_1.assert.deepEqual(index_1.getSimplePaths(lightMachine), {
                '"green"': {
                    state: { value: 'green', context: undefined },
                    paths: [[]]
                },
                '"yellow"': {
                    state: { value: 'yellow', context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            }
                        ]
                    ]
                },
                '{"red":"walk"}': {
                    state: { value: { red: 'walk' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            }
                        ]
                    ]
                },
                '{"red":"wait"}': {
                    state: { value: { red: 'wait' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            }
                        ]
                    ]
                },
                '{"red":"stop"}': {
                    state: { value: { red: 'stop' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            }
                        ]
                    ]
                },
                '{"red":"flashing"}': {
                    state: { value: { red: 'flashing' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'stop' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ]
                    ]
                }
            });
        });
        var equivMachine = xstate_1.Machine({
            initial: 'a',
            states: {
                a: { on: { FOO: 'b', BAR: 'b' } },
                b: { on: { FOO: 'a', BAR: 'a' } }
            }
        });
        it('should return a mapping of simple paths to all states (parallel)', function () {
            chai_1.assert.deepEqual(index_1.getSimplePaths(parallelMachine), {
                '{"a":"a1","b":"b1"}': {
                    state: { value: { a: 'a1', b: 'b1' }, context: undefined },
                    paths: [[]]
                },
                '{"a":"a2","b":"b2"}': {
                    state: { value: { a: 'a2', b: 'b2' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: { a: 'a1', b: 'b1' }, context: undefined },
                                event: { type: '2' }
                            }
                        ]
                    ]
                },
                '{"a":"a3","b":"b3"}': {
                    state: { value: { a: 'a3', b: 'b3' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: { a: 'a1', b: 'b1' }, context: undefined },
                                event: { type: '2' }
                            },
                            {
                                state: { value: { a: 'a2', b: 'b2' }, context: undefined },
                                event: { type: '3' }
                            }
                        ],
                        [
                            {
                                state: { value: { a: 'a1', b: 'b1' }, context: undefined },
                                event: { type: '3' }
                            }
                        ]
                    ]
                }
            });
        });
        it('should return multiple paths for equivalent transitions', function () {
            chai_1.assert.deepEqual(index_1.getSimplePaths(equivMachine), {
                '"a"': { state: { value: 'a', context: undefined }, paths: [[]] },
                '"b"': {
                    state: { value: 'b', context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'a', context: undefined },
                                event: { type: 'FOO' }
                            }
                        ],
                        [
                            {
                                state: { value: 'a', context: undefined },
                                event: { type: 'BAR' }
                            }
                        ]
                    ]
                }
            });
        });
        it('should return a single empty path for the initial state', function () {
            chai_1.assert.deepEqual(index_1.getSimplePaths(lightMachine)['"green"'].paths, [[]]);
            chai_1.assert.deepEqual(index_1.getSimplePaths(equivMachine)['"a"'].paths, [[]]);
        });
        it('should return value-based paths', function () {
            var countMachine = xstate_1.Machine({
                id: 'count',
                initial: 'start',
                context: {
                    count: 0
                },
                states: {
                    start: {
                        on: {
                            '': {
                                target: 'finish',
                                cond: function (ctx) { return ctx.count === 3; }
                            },
                            INC: {
                                actions: xstate_2.assign({ count: function (ctx) { return ctx.count + 1; } })
                            }
                        }
                    },
                    finish: {}
                }
            });
            chai_1.assert.deepEqual(index_1.getSimplePaths(countMachine, {
                events: {
                    INC: [{ type: 'INC', value: 1 }]
                }
            }), {
                '"start" | {"count":0}': {
                    state: { value: 'start', context: { count: 0 } },
                    paths: [[]]
                },
                '"start" | {"count":1}': {
                    state: { value: 'start', context: { count: 1 } },
                    paths: [
                        [
                            {
                                state: { value: 'start', context: { count: 0 } },
                                event: { type: 'INC', value: 1 }
                            }
                        ]
                    ]
                },
                '"start" | {"count":2}': {
                    state: { value: 'start', context: { count: 2 } },
                    paths: [
                        [
                            {
                                state: { value: 'start', context: { count: 0 } },
                                event: { type: 'INC', value: 1 }
                            },
                            {
                                state: { value: 'start', context: { count: 1 } },
                                event: { type: 'INC', value: 1 }
                            }
                        ]
                    ]
                },
                '"finish" | {"count":3}': {
                    state: { value: 'finish', context: { count: 3 } },
                    paths: [
                        [
                            {
                                state: { value: 'start', context: { count: 0 } },
                                event: { type: 'INC', value: 1 }
                            },
                            {
                                state: { value: 'start', context: { count: 1 } },
                                event: { type: 'INC', value: 1 }
                            },
                            {
                                state: { value: 'start', context: { count: 2 } },
                                event: { type: 'INC', value: 1 }
                            }
                        ]
                    ]
                }
            });
        });
    });
    describe('getSimplePathsAsArray()', function () {
        it('should return an array of shortest paths to all states', function () {
            chai_1.assert.deepEqual(graph_1.getSimplePathsAsArray(lightMachine), [
                { state: { value: 'green', context: undefined }, paths: [[]] },
                {
                    state: { value: 'yellow', context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            }
                        ]
                    ]
                },
                {
                    state: { value: { red: 'walk' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            }
                        ]
                    ]
                },
                {
                    state: { value: { red: 'wait' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            }
                        ]
                    ]
                },
                {
                    state: { value: { red: 'stop' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            }
                        ]
                    ]
                },
                {
                    state: { value: { red: 'flashing' }, context: undefined },
                    paths: [
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'stop' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'PED_COUNTDOWN' }
                            },
                            {
                                state: { value: { red: 'wait' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: { red: 'walk' }, context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'TIMER' }
                            },
                            {
                                state: { value: 'yellow', context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ],
                        [
                            {
                                state: { value: 'green', context: undefined },
                                event: { type: 'POWER_OUTAGE' }
                            }
                        ]
                    ]
                }
            ]);
        });
    });
    describe('valueAdjacencyMap', function () {
        it('should map adjacencies', function () {
            var counterMachine = xstate_1.Machine({
                id: 'counter',
                initial: 'empty',
                context: { count: 0 },
                states: {
                    empty: {
                        on: {
                            '': {
                                target: 'full',
                                cond: function (ctx) { return ctx.count === 5; }
                            },
                            INC: {
                                actions: xstate_2.assign({ count: function (ctx, e) { return ctx.count + e.value; } })
                            },
                            DEC: { actions: xstate_2.assign({ count: function (ctx) { return ctx.count - 1; } }) }
                        }
                    },
                    full: {}
                }
            });
            var adjacency = new graph_1.ValueAdjacency(counterMachine, {
                filter: function (state) { return state.context.count >= 0 && state.context.count <= 5; },
                events: {
                    INC: [{ type: 'INC', value: 1 }]
                }
            });
            chai_1.assert.ok(adjacency.reaches('full', { count: 5 }));
        });
    });
});
