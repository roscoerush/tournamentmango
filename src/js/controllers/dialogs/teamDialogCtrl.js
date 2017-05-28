import site from '../../app';

site.controller('teamDialogController', ($scope, $mdDialog, team, viewOnly, TeamManagement, FilterUtils) => {

  $scope.cancel = $mdDialog.cancel;
  $scope.viewOnly = viewOnly;

  const success = (item) => $mdDialog.hide(item);

  $scope.label = _.keys(team).length > 0 ? 'Edit' : 'Add';

  $scope.getLocations = (query = '') => FilterUtils.getAndFilter(TeamManagement.teams, 'location', query);
  $scope.getGames = (query = '') => _.difference(FilterUtils.getAndFilter(TeamManagement.teams, 'games', query), $scope.item.games);
  $scope.getCharacters = (query = '') => _.difference(FilterUtils.getAndFilter(TeamManagement.teams, 'characters', query), $scope.item.characters);

  $scope.item = _.extend({
    aliases: [],
    games: [],
    characters: []
  }, team);

  $scope.addItem = () => {
    $scope.item.form.$setSubmitted();

    if($scope.item.form.$valid) {
      success(_.omit($scope.item, 'form'));
    }
  };
});