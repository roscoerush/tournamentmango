import site from '../../app';

site.controller('teamManageController', ($scope, $firebaseArray, $firebaseObject, $state, $stateParams, Auth, FirebaseURL, CurrentUsers, InputPrompt, UserStatus, CurrentTeamBucket, ShareManagement, SetManagement, SidebarManagement, EnsureLoggedIn, TeamManagement, Toaster, ScoreManagement) => {

  $scope.canOnlySelectUsers = () => $stateParams.teamSelectOnly;
  $scope.backToTournamentsetup = () => $state.go('setupTournament', { tournamentId: $stateParams.tournamentId });

  SidebarManagement.hasSidebar = !$scope.canOnlySelectUsers();
  const authData = EnsureLoggedIn.check();

  $scope.datatable = {
    filter: '',
    order: '-name',
    limit: 10,
    page: 1,
    bookmark: 1
  };

  $scope.filter = { options: { throttle: 500 } };

  $scope.teams = [];
  $scope.visibleUsers = [];
  $scope.selected = [];
  $scope.listKeys = [];
  $scope.sharedLists = [];

  $scope.teamData = UserStatus;

  $scope.addItem = (event) => {
    TeamManagement.addItem(event, newTeam => {
      $scope.teams.$add(newTeam);
    });
  };

  $scope.editItem = (event) => {
    TeamManagement.editItem(event, $scope.selected[0], oldTeam => {
      const item = $scope.teams.$getRecord(oldTeam.$id);
      _.extend(item, oldTeam);
      $scope.teams.$save(item);
    });
  };

  $scope.removeItem = (event) => {
    TeamManagement.removeItem(event, $scope.selected, () => {
      _.each($scope.selected, player => {
        const item = $scope.teams.$getRecord(player.$id);
        $scope.teams.$remove(item);
      });

      $scope.selected = [];
    });
  };

  $scope.viewItem = TeamManagement.viewItem;

  $scope.getUsers = () => {
    $scope.visibleUsers = TeamManagement.filterUsers($scope.teams, $scope.datatable);
  };

  $scope.hideSearch = () => {
    $scope.datatable.filter = '';
    $scope.filter.show = false;
    if($scope.filter.form.$dirty) {
      $scope.filter.form.$setPristine();
    }
  };

  const filterWatch = (newValue, oldValue) => {
    if(!oldValue) {
      $scope.datatable.bookmark = $scope.datatable.page;
    }

    if(newValue !== oldValue) {
      $scope.datatable.page = 1;
    }

    if(!newValue) {
      $scope.datatable.page = $scope.datatable.bookmark;
    }

    $scope.getUsers();
  };

  $scope.$watch('datatable.filter', filterWatch);

  $scope.changeTeamSet = (name = 'default') => {

    const mySet = _.findWhere($scope.listKeys, { short: name });
    UserStatus.firebase.playerSet = name;
    UserStatus.firebase.playerSetUid = mySet ? mySet.uid : authData.uid;

    $scope.isMine = UserStatus.firebase.playerSetUid === authData.uid;
    UserStatus.firebase.$save();
  };

  $scope.setCurrentTeamSet = (setData, name = UserStatus.firebase.playerSet) => {
    $scope.setObject = setData;
    if(!$scope.canOnlySelectUsers()) {
      CurrentTeamBucket.clear();
    }
    $scope.setObject.$loaded(() => {
      if(!$scope.setObject.basename && name) {
        $scope.setObject.basename = name;
        $scope.setObject.$save();
      }
      if(!$scope.setObject.realName && name) {
        $scope.setObject.realName = name;
        $scope.setObject.$save();
      }
      if(!$scope.setObject.owner) {
        $scope.setObject.owner = authData.uid;
        $scope.setObject.$save();
      }
      $scope.loadUserList();
    });
  };

  CurrentUsers.watch.then(null, null, (data) => {
    if(!data.isNewSet) return;
    $scope.setCurrentTeamSet(data.teams);
  });

  $scope.hasMultipleSets = () => $scope.listKeys.length > 1;

  $scope.ownsCurrentSet = () => $scope.setObject ? $scope.setObject.owner === authData.uid : false;

  $scope.doNewSet = (event) => SetManagement.newSet(event, _.pluck($scope.listKeys, 'short'), $scope.changeTeamSet);

  $scope.doRename = (event) => SetManagement.renameSet(event, $scope.setObject.realName, $scope.renameCurrentTeamSet);

  $scope.doDelete = (event) => SetManagement.deleteSet(event, $scope.removeSet);

  $scope.doChange = (event) => SetManagement.changeSet(event, $scope.setObject.realName, $scope.listKeys, $scope.changeSetFromRealname);

  $scope.doOrOpen = (event) => $scope.isOpen ? $scope.doChange(event) : $scope.isOpen = true;

  $scope.doExport = (event) => SetManagement.exportSet(event, _.reject($scope.listKeys, k => k.short === $scope.setObject.basename), $scope.exportToSet);

  $scope.openShareDialog = (event) => SetManagement.shareSet(event, $scope.setObject.realName, $scope.setObject.sharedWith, $scope.updateShareSettings);

  $scope.changeSetFromRealname = (newSet) => $scope.changeTeamSet(_.findWhere($scope.listKeys, { realName: newSet.short }).short);

  $scope.exportToSet = (newSet) => {
    const players = $scope.selected;

    const newSetTeams = $firebaseArray(new Firebase(`${FirebaseURL}/teams/${newSet.uid}/players/${newSet.short}/list`));

    const newTeamObjs = _.map(players, p => _.omit(p, (v, key) => _.contains(key, '$') || _.contains(['wins', 'losses', 'points'], key)));

    newSetTeams.$loaded(() => {
      _.each(newTeamObjs, newSetTeams.$add);
    });
  };

  $scope.updateShareSettings = (shareData) => {
    const oldSharedWith = _.keys($scope.setObject.shareIDs);

    ShareManagement.manageSorting(oldSharedWith, shareData, $scope.setObject.basename);

    $scope.setObject.shareIDs = _.reduce(_.pluck(shareData, 'uid'), (prev, cur) => {
      prev[cur] = true;
      return prev;
    }, {});
    $scope.setObject.sharedWith = shareData;
    $scope.setObject.$save();
  };

  $scope.removeSet = () => {
    const oldSharedWith = _.keys($scope.setObject.shareIDs);
    ShareManagement.manageSorting(oldSharedWith, [], $scope.setObject.basename);

    $scope.setObject.$remove().then(() => {
      $scope.changeTeamSet(_.sample($scope.listKeys).short);
    });
  };

  $scope.renameCurrentTeamSet = (newName) => {
    if(!newName) return;
    $scope.setObject.realName = newName;
    $scope.setObject.$save();
  };

  $scope.loadUserList = () => {
    $scope.teams = TeamManagement.teams = $firebaseArray($scope.setObject.$ref().child('list'));
    $scope.teams.$loaded($scope.getUsers);
    $scope.teams.$watch($scope.getUsers);
  };

  $scope.resetListKeys = () => {
    $scope.listKeys = _.reject(_.keys($scope.allLists), (key) => _.contains(key, '$'));
    $scope.listKeys = _.map($scope.listKeys, (key) => {
      return { realName: $scope.allLists[key].realName, short: key, uid: authData.uid, group: 'Mine' };
    });
    $scope.listKeys = $scope.listKeys.concat($scope.sharedLists);
  };

  $scope.loadAllLists = () => {
    $scope.allLists = $firebaseObject(new Firebase(`${FirebaseURL}/teams/${authData.uid}/players`));
    $scope.allLists.$watch($scope.resetListKeys);
  };

  $scope.loadSharedWithMe = () => {
    const sharedWithMe = $firebaseObject(new Firebase(`${FirebaseURL}/shares/${authData.uid}`));
    sharedWithMe.$watch(() => {
      $scope.sharedLists = [];

      _.each(_.keys(sharedWithMe), (sharer) => {

        if(_.contains(sharer, '$')) return;
        const sharedbase = $firebaseObject(new Firebase(`${FirebaseURL}/teams/${sharer}`));

        sharedbase.$loaded().then(() => {
          _.each(sharedWithMe[sharer], doc => {
            const sharename = sharedbase.name;
            const realDoc = sharedbase.players[doc];
            $scope.sharedLists.push({ realName: realDoc.realName, uid: sharer, short: realDoc.basename, group: `Shared by ${sharename}` });
          });
          $scope.resetListKeys();

        });
      });
    });
  };

  $scope.addToTeamBucket = () => {
    CurrentTeamBucket.add($scope.selected);
    Toaster.show(`Successfully added ${$scope.selected.length} players to bucket.`);
    $scope.selected = [];
  };

  $scope.currentTeamBucketSize = () => CurrentTeamBucket.get().length;

  $scope.anyCompletedTournaments = ScoreManagement.anyCompletedTournaments;
  $scope.allCompletedTournamentGames = ScoreManagement.allCompletedTournamentGames;

  $scope.recalculateScore = () => {
    $scope.calculating = true;

    ScoreManagement.recalculateScore();

    $scope.calculating = false;
  };

  $scope.saveFirebase = () => {
    UserStatus.firebase.$save();
    $scope.recalculateScore();
  };

  $scope.load = () => {
    Auth.ready.then(() => {
      UserStatus.firebase.$loaded(() => {

        if(!UserStatus.firebase.playerSet) {
          $scope.changeTeamSet('default');
        }

        $scope.setCurrentTeamSet(CurrentUsers.get());

        $scope.isMine = UserStatus.firebase.playerSetUid === authData.uid;
      });
      $scope.loadAllLists();
      $scope.loadSharedWithMe();
    });
  };

  $scope.load();

});