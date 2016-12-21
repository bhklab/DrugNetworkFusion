'use strict';

angular.module('dnftestApp')
  .controller('NetworkCtrl', function ($scope, $state,$http, $stateParams, Restangular) {
    $scope.selected = null;
    $scope.showOptions = false;
    $scope.dest = null;
    $scope.nodeToSearch = null;
    $scope.image = null;
    $scope.networkToShow = $stateParams.id;
    $scope.exemplarData = null;
    $scope.showInfo = false;
    $scope.selectedNode = false;
    $scope.selectedEdge = false;
    $scope.showChart = false;
    $scope.state = 'Exemplar';

    $scope.networkData = null;
    //the max/min weight of normal graph edges
    $scope.maxWeight = 0;
    $scope.minWeight = 0;
    //the max/min weight of exemplar graph edges
    $scope.exemplarMaxWeight = 0;
    $scope.exemplarMinWeight = 0;

    var pData = null;
    //$scope.nodes = {title: 'hiiiiiiii'}; //seems to be extraneous leftover variable

    $scope.cy = null;

    $scope.bringBack = function () {
      $scope.cy.zoom(0.5);
    };

    $scope.search = function (node) {
      displayCluster(node);
      //$scope.cy.center('#' + node);
      // $scope.cy.zoom(0.5);
      // $scope.cy.center('#' + node);
    };

    $scope.download = function () {
      var downloadLink = angular.element('<a></a>');
      downloadLink.attr('href', $scope.cy.png());
      downloadLink.attr('download', $stateParams.id);
      downloadLink[0].click();
    };

    $scope.back = function(){
      hideToolbar();
      // window.history.back();
      $state.go("main");
    }

    //This function gets the data--i.e. the nodes and the edges
    var getNetworkData = function () {
      Restangular.all('api/things/drug_network/').get($stateParams.id).then(function (data) {
        $scope.networkData = JSON.parse(data).element;
        var maxWeight = 0;
        var minWeight = 9999999;
        for (var i =0; i<$scope.networkData.edges.length;i++){
          var edge = $scope.networkData.edges[i]
          if (edge.data.weight > maxWeight){
            maxWeight = edge.data.weight;
          }
          if (edge.data.weight < minWeight){
            minWeight = edge.data.weight;
          }
        }
        $scope.maxWeight = maxWeight;
        $scope.minWeight = minWeight;
        // $scope.display();
      });
    };

    var populateDrugList = function () {
        Restangular.all('api/things/drug_list/').get($stateParams.id).then(function (data) {
          $scope.nodes = JSON.parse(data).data;
          $('.ui.search')
            .search({
              source: $scope.nodes,
              searchFields: [
                'title'
              ],
              searchFullText: false,
              onSelect: function (result, response) {
                $scope.search(result.title);
              }
            });
        });
      };

    var getExemplar = function () {
      Restangular.all('api/things/exemplar/').get($stateParams.id).then(function (data) {
        $scope.exemplarData = JSON.parse(data).elements;
        var maxWeight = 0;
        var minWeight = 9999999;
        for (var i =0; i<$scope.exemplarData.edges.length;i++){
          var edge = $scope.exemplarData.edges[i]
          if (edge.data.weight > maxWeight){
            maxWeight = edge.data.weight;
          }
          if (edge.data.weight < minWeight){
            minWeight = edge.data.weight;
          }
        }
        $scope.exemplarMaxWeight = maxWeight;
        $scope.exemplarMinWeight = minWeight;
        console.log('here');
        $scope.displayExemplar();
      });
    };


    $scope.displayExemplar = function () {
      $scope.state = 'Exemplar';
      $scope.showInfo = false;
      $scope.showChart = false;

      $scope.cy = cytoscape({
        container: document.getElementById('cy'),
        elements: $scope.exemplarData,
        autolock: false, //worth looking into later
        autoungrabify: false,
        layout: {
           name: 'cose',
          idealEdgeLength: function (edge) {
            // for (var i = 0; i < $scope.networkData.edges.length; i++) {
            //   var curEdge = $scope.networkData.edges[i].data;
            //   if (edge._private.data.source == curEdge.source && edge._private.data.target == curEdge.target) {
            //     return curEdge.weight;
            //   };
            // };
            return 1/edge._private.data.weight;
          }
        },
        zoom: 0.3,
        style: [
          {
            selector: 'node',
            style: {
              'content': 'data(id)',
              'background-fit': 'cover',
              'background-color': 'data(colo)'
            }
          },
          {
            selector: 'edge',
            style:{
              'line-color': 'mapData(weight,' + $scope.exemplarMinWeight.toString() +' ,' + $scope.exemplarMaxWeight.toString() +', white, black)',
              'width': 3
            }
          }
        ]
      });

      $scope.cy.on('tap', 'node', function (evt) {
        displayCluster(evt.cyTarget.id());
      });

      $scope.cy.on('tap', 'edge', function (evt) {
        $scope.showChart = true;
        $scope.showInfo = false;
        showScoreBreakdown(evt.cyTarget);
        $scope.$apply();

        // showScoreBreakDown(evt.cyTarget);
        //  $scope.selected = evt.cyTarget.id();
        //  $scope.cy.zoom(0.5);
        // $scope.cy.center('#' + evt.cyTarget.id());
      });
      showToolbar();
    };

    var getCluster = function () {
      Restangular.all('api/things/drug_clusters/').get($stateParams.id).then(function (data) {
        $scope.clusters = JSON.parse(data).element;
      });
    };

    var getClusterNum = function (node) {
      for (var i = 0; i < $scope.networkData.nodes.length; i++) {
        var obj = $scope.networkData.nodes[i].data;
        if (obj.id == node) {
          return (obj.cluster);
        }
      }
    };




    var showScoreBreakdown = function(edge) {
        $scope.showChart = true;

        $scope.selectedEdge = {score: edge._private.data.weight.toFixed(2), source: edge._private.data.source, target: edge._private.data.target};


      $('#pie').remove(); // this is my <canvas> element
      $('#chart').append('<canvas id="pie"><canvas>');

      var ctx = document.getElementById("pie");
      var myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ["Perturbation", "Sensitivity", "Structure"],
          datasets: [{
            data: [edge._private.data['perturbation'], edge._private.data['physical structure'], edge._private.data['sensitivity']],
            backgroundColor: [
              'rgba(219, 219, 219, 0.5)',
              'rgba(183, 183, 183, 0.5)',
              'rgba(112, 112, 112, 0.5)'
            ],
            borderColor: [
              'rgba(219, 219, 219, 1)',
              'rgba(183, 183, 183, 1)',
              'rgba(112, 112, 112, 1)'
            ],
            borderWidth: 1
          }]
        }
      });

      //scatter
      $('#scatter').remove(); // this is my <canvas> element
      $('#chart').append('<canvas id="scatter" width="400" height="400" style="padding-top:30px;"><canvas>');
      var stx = document.getElementById("scatter");
      var scatterChart = new Chart(stx, {
        type: 'line',
        data: {
            labels: ["Structure", "Pertubation", "Sensitivity"],
            datasets: [{
                        label: "Percentage",
                        fill: false,
                        backgroundColor: "rgba(75,192,192,0.4)",
                        borderColor: "rgba(75,192,192,1)",
                        borderCapStyle: 'butt',
                        borderDash: [],
                        borderDashOffset: 0.0,
                        borderJoinStyle: 'miter',
                        pointBorderColor: "rgba(112, 112, 112, 1)",
                        pointBackgroundColor: "rgba(112, 112, 112, 0.5)",
                        pointBorderWidth: 1,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: "rgba(112, 112, 112, 1)",
                        pointHoverBorderColor: "rgba(112, 112, 112, 1)",
                        pointHoverBorderWidth: 2,
                        pointRadius: 5,
                        pointHitRadius: 10,
                        data: [edge._private.data['sensitivity'], edge._private.data['perturbation'], edge._private.data['physical structure']],
                        showLine: false,
                        spanGaps: false,
                    }
                ]
            },
            options: {
               legend: {
                  display: false
               },
            }
      });
      //scatter end
      

      $scope.$apply();
    };

    var showToolbar = function (){
      //This enable the toolbar;
      console.log("showingToolbar");
      hideToolbar();
      $scope.cy.toolbar({position: 'right'});
    };

    var hideToolbar = function (){
      $("div.ui-cytoscape-toolbar").remove();
    };

    var showPubChem = function (node) {
      $scope.showInfo = true;
      $scope.selectedNode = {url: node._private.data.url || "Not found.", id: node._private.data.id};
      if ($scope.selectedNode.url == "null") {
        $scope.selectedNode.url = "Not found.";
      }


      var c = $scope.selectedNode.url.lastIndexOf("/");
      var id = $scope.selectedNode.url.substring(c + 1, $scope.selectedNode.url.length - 1);
      var data = null;
      Restangular.one('https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/' + id + '/JSON/')
        .get().then(function (serverJson) {
        console.log(serverJson);


      });


      $scope.$apply();
    };

    var displayCluster = function (nodeName) {
      $scope.state = 'Cluster';
      $scope.$apply();
      $scope.showInfo = false;
      $scope.showChart = false;

      var clusterNum = getClusterNum(nodeName);

        //Makes a new instance of cy based on the group of nodes given
        $scope.cy = cytoscape({
          container: document.getElementById('cy'),
          elements: $scope.clusters[clusterNum],
          //autolock: true,
          layout: {
            name: 'cose',
            idealEdgeLength: function (edge) {
              for (var i = 0; i < $scope.networkData.edges.length; i++) {
                var curEdge = $scope.networkData.edges[i].data;
                if (edge._private.data.source == curEdge.source && edge._private.data.target == curEdge.target) {
                  return 1/curEdge.weight;
                };
              };
            }
          },
          zoom: 1,
          maxZoom: 5,
          minZoom: 0.3,
          style: [
            {
              selector: 'node',
              style: {
                'content': 'data(id)',
                'background-fit': 'cover',
                'background-color': 'data(colo)'
              }
            },
            {
              selector: 'edge',
              style:{
                'line-color': 'mapData(weight,' + $scope.minWeight.toString() +' ,' + $scope.maxWeight.toString() +', white, black)',
                'width': 3.0
              }
            }
          ]
        });

      $scope.cy.on('tap', 'node', function (evt) {
        $scope.showChart = false;
        showPubChem(evt.cyTarget);
      });

      $scope.cy.on('tap', 'edge', function (evt) {
        $scope.showChart = true;
        $scope.showInfo = false;
        showScoreBreakdown(evt.cyTarget);
        $scope.$apply();
        // showScoreBreakDown(evt.cyTarget);
        //  $scope.selected = evt.cyTarget.id();
        //  $scope.cy.zoom(0.5);
        // $scope.cy.center('#' + evt.cyTarget.id());
      });
      showToolbar();
    };

    $scope.display = function () {
      $scope.state = 'Full Network';
      $scope.showInfo = false;
      $scope.showChart = false;

       $scope.cy = cytoscape({
        container: document.getElementById('cy'),
        elements: $scope.networkData,
        autolock: false, //worth looking into later
        autoungrabify: false,
        layout: {
          name: 'cose',
          idealEdgeLength: function (edge) {
            for (var i = 0; i < $scope.networkData.edges.length; i++) {
              var curEdge = $scope.networkData.edges[i].data;
              if (edge._private.data.source == curEdge.source && edge._private.data.target == curEdge.target) {
                return 1/curEdge.weight;
              };
            };
          }
        },
        zoom: 0.3,
        style: [
          {
            selector: 'node',
            style: {
              'content': 'data(id)',
              'background-fit': 'cover',
              'background-color': 'data(colo)'
            }
          },
          {
          	selector: 'edge',
          	style:{
          		'line-color': 'mapData(weight,' + $scope.minWeight.toString() +' ,' + $scope.maxWeight.toString() +', white, black)',
              'width': 3.0
          	}
          }
        ]
      });

     $scope.cy.maxZoom(5);
     $scope.cy.minZoom(0.3);
      $scope.cy.on('tap', 'node', function (evt) {

        displayCluster(evt.cyTarget.id());
      });

      $scope.cy.on('tap', 'edge', function (evt) {
        $scope.showChart = true;
        $scope.showInfo = false;
        showScoreBreakdown(evt.cyTarget);
        $scope.$apply();

        // showScoreBreakDown(evt.cyTarget);
        //  $scope.selected = evt.cyTarget.id();
        //  $scope.cy.zoom(0.5);
        // $scope.cy.center('#' + evt.cyTarget.id());
      });
      showToolbar();
    };


    $('.ui.dropdown')
      .dropdown()
    ;

    /// run this code when controller load
    getCluster();
    getNetworkData();
    populateDrugList();
    getExemplar();
    // $scope.display();
    //cy.$('ABT737').lock();
  });
