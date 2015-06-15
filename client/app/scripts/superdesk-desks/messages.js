
(function() {

'use strict';

var ENTER = 13;

MessagesService.$inject = ['api'];
function MessagesService(api) {

    this.messages = null;

    this.fetch = function(item) {
        var criteria = {
            where: {
                item: item
            },
            embedded: {user: 1}
        };

        return api.item_messages.query(criteria)
            .then(angular.bind(this, function(result) {
                this.messages = result._items;
            }));
    };

    this.save = function(message) {
        return api.item_messages.save(message);
    };
}

MessagesCtrl.$inject = ['$scope', '$routeParams', 'messagesService', 'api', '$q'];
function MessagesCtrl($scope, $routeParams, messagesService, api, $q) {

    $scope.text = null;
    $scope.saveEnterFlag = false;
    $scope.$watch('item._id', reload);
    $scope.users = [];

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
            item: $scope.item._id
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
    /*.config(['apiProvider', function(apiProvider) {
        apiProvider.api('item_comments', {
            type: 'http',
            backend: {rel: 'item_comments'}
        });
    }])*/
    .controller('MessagesCtrl', MessagesCtrl)
    .service('messagesService', MessagesService)
    .directive('sdMessageText', MessageTextDirective);

    return msgMod;

})();
