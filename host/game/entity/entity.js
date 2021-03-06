var CANNON = require('../libs/cannon');
var THREE = require('../libs/three');
var OBJMTLLoader = require('../libs/loaders/OBJMTLLoader');
/*
Entity.js - A Wrapper around Cannon.js and Three.js that provides a
  game-esque 3d entity system
*/



if (!String.prototype.endsWith) { //Polyfill
  String.prototype.endsWith = function(subs) {
    return (this.indexOf(subs)>-1) && (this.indexOf(subs)===(this.length-subs.length));
  };
}


/**
* Construct a generic physically simulated entity object
*/
var Entity = function() {
  Entity._registry.push(this);
};

/**
* Set the entity's model, optional callback for when complete
*/
Entity.prototype.setModel = function(path, cb, cb2) {
  var mtlurl = null;
  if (cb2) {
    mtlurl = cb; cb = cb2;
  }
  var self = this;
  var loader;
  if (path.endsWith('.js') || path.endsWith('.json')) {
    loader = new THREE.JSONLoader(); //Will error if loader isn't defined
    loader.load(path, function(geometry, mats) {
      self.setGeometry(geometry, mats);
      if (cb) cb(self);
    });
  } else if (path.endsWith('.obj')) {
    if (mtlurl) {
      loader = new THREE.OBJMTLLoader(); //Special, textured, snowflake
      loader.load(path, mtlurl, function(object) {
        self._physobj = object; //Add w/o physics simulation
        self._physobj.castShadow = true;
        if (cb) cb(self);
      });
    } else {
      loader = new THREE.OBJLoader();
      loader.load(path, function(geometry, mats) {
        self.setGeometry(geometry, mats);
        if (cb) cb(self);
      });
    }
  } else if (path.endsWith('.dae')) {
    loader = new THREE.ColladaLoader();
    loader.load(path, function(geometry, mats) {
      self.setGeometry(geometry, mats);
      if (cb) cb(self);
    });
  }
};

/**
* Set the raw geometry object being used in the entity
*/
Entity.prototype.setGeometry = function(geom, mats) {
  var facemat = null;
  if (mats && mats.length>0) {
    facemat = mats[0];
  } else {
    facemat = new THREE.MeshLambertMaterial({ color: 0xdedede });
  }

  var tGeom = null;
  if (geom instanceof THREE.Geometry) {
    tGeom = geom;
  } else {
    tGeom = geom.children[0].geometry; //Need to check if there's a situation where this is incorrect to assume
  }

  if (this.mesh) {
    var pos = this.getPos();
    var rot = this.getRotation();
    scene.remove(this.mesh);
    this.mesh = new THREE.Mesh(tGeom, facemat);
    scene.add(this.mesh);
    this.setPos(pos);
    this.setRotation(rot);
  } else {
    this.mesh = new THREE.Mesh(tGeom, facemat); //Assume worst case for phys meshes
    scene.add(this.mesh);
    this.setPos(this.pos || new THREE.Vector3());
    this.setRotation(this.rot || new THREE.Quaternion());
  }
  this.mesh.castShadow = true;
  //this.mesh.recieveShadow = true; //Self-shadowing makes it slow on bad machines
};

Entity.prototype.setPhysicsBody = function(body) {
  if (this.body) {
      world.remove(this.body);
      body.gravity = this.body.gravity;
  }
  body.position.copy(this.mesh.position);
  body.quaternion.copy(this.mesh.quaternion);
  this.body = body;
};

/**
* Set the physobj's mass
*/
Entity.prototype.setMass = function(mass) {
  this.mass = mass;
  if (this.body)
    this.bosy.mass = mass;
};

/**
* Set the scene entities are added to on a global basis
*/
var world = null;
Entity.setWorld = function(o) {
  world = o;
};

/**
* Set the scene entities are added to on a global basis
*/
var scene = null;
Entity.setScene = function(o) {
  scene = o;
};

Entity._registry = [];
Entity._think = function() {
  for (var i=0; i<Entity._registry.length; i++) {
    var ent = Entity._registry[i];
    if (ent.mesh && ent.body) {
        ent.mesh.position.copy(ent.body.position);
        ent.mesh.quaternion.copy(ent.body.quaternion);
    }
  }

  for (var i=0; i<Entity._registry.length; i++) {
    var ent = Entity._registry[i];
    if (ent.think) {
      ent.think();
    }
  }  
};

/**
* Set the entity's position
*/
Entity.prototype.setPos = function(vec) {
  this.pos = vec;
  if (this.mesh) {
    this.mesh.position.set(vec.x, vec.y, vec.z);
  }
  if (this.body) {
    this.body.position.set(vec.x, vec.y, vec.z);
  }  
};

/**
* Get the entity's position (may error if physobj hasn't loaded yet)
*/
Entity.prototype.getPos = function() {
  return this.mesh.position;
};

/**
* Set the entity's rotation
*/
Entity.prototype.setRotation = function(quat) {
  this.rot = quat;
  if (this.body) {
    this.body.quaternion.copy(quat);
  }
  if (this.mesh) {
    this.mesh.quaternion.copy(quat);
  }  
};  

/**
* Get the entity's rotation (may error if the physobj hasn't been loaded yet)
*/
Entity.prototype.getRotation = function() {
  return this.mesh.quaternion;
};

/**
* Remove the entity from the world
*/
Entity.prototype.remove = function() {

  if (this.onRemove)
    this.onRemove();
  
  Entity._registry.splice(Entity._registry.indexOf(this), 1);

  world.remove(this.body);
  scene.remove(this.mesh);
};

/**
* Apply a central force to the object
*/
Entity.prototype.applyForce = function(vec) {
  if (this.body) {
    this.body.applyCentralForce(vec); //may not be right
  }
};

/**
* Set the gravitational force applied ot the object
*/
Entity.prototype.setGravity = function(g) {
  this.gravity = g;
  if (this.body)
    this.body.gravity = g;
};

/**
* Get the forward vector of the object in world coordinates
*/
Entity.prototype.Forward = function() {
  var local = new THREE.Vector3(0,0,-1);
  var world = local.applyMatrix4(this.mesh.matrixWorld);
  var dir = world.sub(this.mesh.position).normalize();

  return dir;
};

module.exports = Entity;