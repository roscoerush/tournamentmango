import site from '../../app';

site.service('TeamManagement', (FirebaseURL, $mdDialog, Toaster, FilterUtils) => {

  const defaultMdDialogOptions = {
    controller: 'teamDialogController',
    focusOnOpen: false,
    templateUrl: '/dialog/addteam'
  };

  const addItem = (event, callback) => {
    const mdDialogOptions = _.clone(defaultMdDialogOptions);
    mdDialogOptions.event = event;
    mdDialogOptions.locals = { team: {}, viewOnly: false };
    $mdDialog.show(mdDialogOptions).then(callback);
  };

  const editItem = (event, team, callback) => {
    const mdDialogOptions = _.clone(defaultMdDialogOptions);
    mdDialogOptions.event = event;
    mdDialogOptions.locals = { team, viewOnly: false };
    $mdDialog.show(mdDialogOptions).then(callback);
  };

  const removeItem = (event, teams, callback) => {
    const dialog = $mdDialog.confirm()
      .targetEvent(event)
      .title('Remove Team')
      .content(`Are you sure you want to remove ${teams.length} teams?`)
      .ok('OK')
      .cancel('Cancel');

    $mdDialog.show(dialog).then(() => {
      Toaster.show(`Successfully removed ${teams.length} teams.`);
      callback();
    });
  };

  const viewItem = (event, team) => {
    event.stopPropagation();
    const mdDialogOptions = _.clone(defaultMdDialogOptions);
    mdDialogOptions.event = event;
    mdDialogOptions.locals = { team, viewOnly: true };
    $mdDialog.show(mdDialogOptions);
  };

  const filterTeams = (teams, datatable) => {
    return FilterUtils.filterTable(teams, datatable, team => [
      [team.name.toLowerCase()],
      [team.location ? team.location.toLowerCase() : ''],
      FilterUtils.getFilterArr(team, 'aliases'),
      FilterUtils.getFilterArr(team, 'games'),
      FilterUtils.getFilterArr(team, 'characters')
    ]);
  };

  return {
    addItem,
    editItem,
    removeItem,
    viewItem,
    filterTeams
  };
});