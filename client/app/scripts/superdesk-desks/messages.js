
(function() {

'use strict';

var ENTER = 13;

MessagesService.$inject = ['api'];
function MessagesService(api) {

    this.session = null;

    this.fetch = function(item) {
        var criteria = {
            where: {
                item: item
            },
            embedded: {user: 1}
        };

        return api.chat_messages.query(criteria)
            .then(angular.bind(this, function(result) {
                this.messages = result._items;
            }));
    };

    this.create_chat_session = function (user) {
        var session = {users: [user._id]}; // add more user_ids comma separated here to include in session and patch/ PR-719

        // var _sessionObj = {
        //     sessionId: '1234',
        //     userlist:{name: 'Syed Junaid'}
        // };
        //this.session = _sessionObj;
        
        var self = this;
        
        return api.chat_sessions.save(session)
        .then(function(new_session) {
             self.session = new_session;
        });
    };

    this.save = function(message) {
        return api.chat_messages.save(message);
    };
}

MessagesCtrl.$inject = ['$scope', '$routeParams', 'messagesService', 'api', '$q', 'usersService'];
function MessagesCtrl($scope, $routeParams, messagesService, api, $q, usersService) {

    $scope.text = null;
    $scope.saveEnterFlag = false;
    $scope.$watch('item._id', reload);
    $scope.users = [];
    $scope.items =  messagesService.session; //{0:['Syed Junaid']};
    $scope.userslist = [];
    $scope.userslist.push(messagesService.session);
    $scope.messages = [];
    //console.log($scope.users);

    $scope.preview = function(user) {
        //call mesagingService.fetch
        $scope.messages.push(user);
    };

    $scope.isLoggedIn = function(user) {
        return usersService.isLoggedIn(user);
    };


    $scope.removePerson = function(user) {
        //call mesagingService.fetch
        $scope.userslist.pop(user);
    };

    $scope.saveOnEnter = function($event) {
        if (!$scope.saveEnterFlag || $event.keyCode !== ENTER || $event.shiftKey) {
            return;
        }
        $scope.save();
    };

    $scope.save = function() {
        var text = $scope.text || '';
        if (!text.length) {
            return;
        }

        $scope.text = '';
        $scope.flags = {saving: true};

        messagesService.save({
            text: text,
            session_id: messagesService.session._id,//$scope.item._id
        }).then(reload);
    };

    $scope.cancel = function() {
        $scope.text = '';
    };

    function reload() {
        if ($scope.item) {
            messagesService.fetch($scope.item._id).then(function() {
                $scope.messages = messagesService.messages;
            });
        }
    }

    $scope.$on('item:message', function(e, data) {
        if (data.item === $scope.item.guid) {
            reload();
        }
    });

    function setActiveMessage() {
        $scope.active = $routeParams.messages || null;
    }

    $scope.$on('$locationChangeSuccess', setActiveMessage);
    setActiveMessage();
}

MessageTextDirective.$inject = ['$compile'];
function MessageTextDirective($compile) {
    return {
        scope: {
            message: '='
        },
        link: function(scope, element, attrs) {

            var html;

            //replace new lines with paragraphs
            html  = attrs.text.replace(/(?:\r\n|\r|\n)/g, '</p><p>');

            //map user mentions
            var mentioned = html.match(/\@([a-zA-Z0-9-_.]\w+)/g);
            _.each(mentioned, function(token) {
                var username = token.substring(1, token.length);
                if (scope.message.mentioned_users && scope.message.mentioned_users[username]) {
                    html = html.replace(token,
                    '<i sd-user-info data-user="' + scope.message.mentioned_users[username] + '">' + token + '</i>');
                }
            });

            //build element
            element.html('<p><b>' + attrs.name + '</b> : ' + html + '</p>');

            $compile(element.contents())(scope);
        }
    };
}

var msgMod = angular.module('superdesk.messages.chat', ['mentio', 'superdesk.api', 'superdesk.desks', 'superdesk.messages.chat'])
    .config(['apiProvider', function(apiProvider) {
        apiProvider.api('chat_sessions', {
            type: 'http',
            backend: {rel: 'chat_sessions'}
        });
        apiProvider.api('chat_messages', {
            type: 'http',
            backend: {rel: 'chat_messages'}
        });
    }])
    .controller('MessagesCtrl', MessagesCtrl)
    .service('messagesService', MessagesService)
    .directive('sdMessageText', MessageTextDirective);

return msgMod;

})();
