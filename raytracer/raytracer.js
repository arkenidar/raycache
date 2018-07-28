var Vector = (function () {
    function Vector(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vector.times = function (k, v) { return new Vector(k * v.x, k * v.y, k * v.z); };
    Vector.minus = function (v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z); };
    Vector.plus = function (v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z); };
    Vector.dot = function (v1, v2) { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; };
    Vector.mag = function (v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); };
    Vector.norm = function (v) {
        var mag = Vector.mag(v);
        var div = (mag === 0) ? Infinity : 1.0 / mag;
        return Vector.times(div, v);
    };
    Vector.cross = function (v1, v2) {
        return new Vector(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
    };
    return Vector;
}());

// es6 class
class Color{
    constructor(r, g, b) {
        this.r = r
        this.g = g
        this.b = b
    }
    static scale(k, v) { return new Color(k * v.r, k * v.g, k * v.b) }
    static plus(v1, v2) { return new Color(v1.r + v2.r, v1.g + v2.g, v1.b + v2.b) }
    static times(v1, v2) { return new Color(v1.r * v2.r, v1.g * v2.g, v1.b * v2.b) }
    static toDrawingColor(c) {
        var legalize = function (d) { return d > 1 ? 1 : d }
        let r= Math.floor(legalize(c.r) * 255)
        let g= Math.floor(legalize(c.g) * 255)
        let b= Math.floor(legalize(c.b) * 255)
        return new Color(r,g,b)
    }
    static get white(){ return new Color(1,1,1) }
    static get yellow(){ return new Color(1,1,0) }
    static get green(){ return new Color(0,1,0) }
    static get red(){ return new Color(1,0,0) }
    
    static get grey(){ return new Color(0.5, 0.5, 0.5) }
    static get black(){ return new Color(0.0, 0.0, 0.0) }
    static get background(){ return this.black }
    static get defaultColor(){ return this.black }
}

var Camera = (function () {
    function Camera(pos, lookAt) {
        this.pos = pos;
        var down = new Vector(0.0, -1.0, 0.0);
        this.forward = Vector.norm(Vector.minus(lookAt, this.pos));
        this.right = Vector.times(1.5, Vector.norm(Vector.cross(this.forward, down)));
        this.up = Vector.times(1.5, Vector.norm(Vector.cross(this.forward, this.right)));
    }
    return Camera;
}());
var Sphere = (function () {
    function Sphere(center, radius, surface) {
        this.center = center;
        this.surface = surface;
        this.radius2 = radius * radius;
    }
    Sphere.prototype.normal = function (pos) { return Vector.norm(Vector.minus(pos, this.center)); };
    Sphere.prototype.intersect = function (ray) {
        var eo = Vector.minus(this.center, ray.start);
        var v = Vector.dot(eo, ray.dir);
        var dist = 0;
        if (v >= 0) {
            var disc = this.radius2 - (Vector.dot(eo, eo) - v * v);
            if (disc >= 0) {
                dist = v - Math.sqrt(disc);
            }
        }
        if (dist === 0) {
            return null;
        }
        else {
            return { thing: this, ray: ray, dist: dist };
        }
    };
    return Sphere;
}());
var Plane = (function () {
    function Plane(norm, offset, surface) {
        this.surface = surface;
        this.normal = function (pos) { return norm; };
        this.intersect = function (ray) {
            var denom = Vector.dot(norm, ray.dir);
            if (denom > 0) {
                return null;
            }
            else {
                var dist = (Vector.dot(norm, ray.start) + offset) / (-denom);
                return { thing: this, ray: ray, dist: dist };
            }
        };
    }
    return Plane;
}());
var Surfaces;
(function (Surfaces) {
    Surfaces.shinyWhite = {
        diffuse: function (pos) { return Color.white; },
        specular: function (pos) { return Color.white; },
        reflect: function (pos) { return 0.2; },
        roughness: 250
    }
    Surfaces.shinyRed = {
        diffuse: function (pos) { return Color.red; },
        specular: function (pos) { return Color.white; },
        reflect: function (pos) { return 0.5; },
        roughness: 250
    }
    Surfaces.checkerboard = {
        diffuse: function (pos) {
            if( Math.sqrt(pos.z**2+pos.x**2) < 7) {
                return Color.green;
            }
            else {
                return Color.yellow;
            }
        },
        specular: function (pos) { return Color.white; },
        reflect: function (pos) {
            if ((Math.floor(pos.z) + Math.floor(pos.x)) % 2 !== 0) {
                return 0.1;
            }
            else {
                return 0.7;
            }
        },
        roughness: 150
    };
})(Surfaces || (Surfaces = {}));
var RayTracer = (function () {
    function RayTracer() {
        this.maxDepth = 0;
    }
    RayTracer.prototype.intersections = function (ray, scene) {
        var closest = +Infinity;
        var closestInter = undefined;
        for (var i in scene.things) {
            var inter = scene.things[i].intersect(ray);
            if (inter != null && inter.dist < closest) {
                closestInter = inter;
                closest = inter.dist;
            }
        }
        return closestInter;
    };
    RayTracer.prototype.testRay = function (ray, scene) {
        var isect = this.intersections(ray, scene);
        if (isect != null) {
            return isect.dist;
        }
        else {
            return undefined;
        }
    };
    RayTracer.prototype.traceRay = function (ray, scene, depth) {
        var isect = this.intersections(ray, scene);
        if (isect === undefined) {
            return Color.background;
        }
        else {
            return this.shade(isect, scene, depth);
        }
    };
    RayTracer.prototype.shade = function (isect, scene, depth) {
        var d = isect.ray.dir;
        var pos = Vector.plus(Vector.times(isect.dist, d), isect.ray.start);
        var normal = isect.thing.normal(pos);
        var reflectDir = Vector.minus(d, Vector.times(2, Vector.times(Vector.dot(normal, d), normal)));
        var naturalColor = Color.plus(Color.background, this.getNaturalColor(isect.thing, pos, normal, reflectDir, scene));
        var reflectedColor = (depth >= this.maxDepth) ? Color.grey : this.getReflectionColor(isect.thing, pos, normal, reflectDir, scene, depth);
        return Color.plus(naturalColor, reflectedColor);
    };
    RayTracer.prototype.getReflectionColor = function (thing, pos, normal, rd, scene, depth) {
        return Color.scale(thing.surface.reflect(pos), this.traceRay({ start: pos, dir: rd }, scene, depth + 1));
    };
    RayTracer.prototype.getNaturalColor = function (thing, pos, norm, rd, scene) {
        var _this = this;
        var addLight = function (col, light) {
            var ldis = Vector.minus(light.pos, pos);
            var livec = Vector.norm(ldis);
            var neatIsect = _this.testRay({ start: pos, dir: livec }, scene);
            var isInShadow = (neatIsect === undefined) ? false : (neatIsect <= Vector.mag(ldis));
            if (isInShadow) {
                return col;
            }
            else {
                var illum = Vector.dot(livec, norm);
                var lcolor = (illum > 0) ? Color.scale(illum, light.color)
                    : Color.defaultColor;
                var specular = Vector.dot(livec, Vector.norm(rd));
                var scolor = (specular > 0) ? Color.scale(Math.pow(specular, thing.surface.roughness), light.color)
                    : Color.defaultColor;
                return Color.plus(col, Color.plus(Color.times(thing.surface.diffuse(pos), lcolor), Color.times(thing.surface.specular(pos), scolor)));
            }
        };
        return scene.lights.reduce(addLight, Color.defaultColor);
    };
    RayTracer.prototype.render = function (scene, ctx, screenWidth, screenHeight) {
        var getPoint = function (x, y, camera) {
            var recenterX = function (x) { return (x - (screenWidth / 2.0)) / 2.0 / screenWidth; };
            var recenterY = function (y) { return -(y - (screenHeight / 2.0)) / 2.0 / screenHeight; };
            return Vector.norm(Vector.plus(camera.forward, Vector.plus(Vector.times(recenterX(x), camera.right), Vector.times(recenterY(y), camera.up))));
        };
        for (var y = 0; y < screenHeight; y++) {
            for (var x = 0; x < screenWidth; x++) {
                var color = this.traceRay({ start: scene.camera.pos, dir: getPoint(x, y, scene.camera) }, scene, 0);
                var c = Color.toDrawingColor(color);
                ctx.fillStyle = "rgb(" + String(c.r) + ", " + String(c.g) + ", " + String(c.b) + ")";
                ctx.fillRect(x, y, x + 1, y + 1);
            }
        }
    };
    return RayTracer;
}());
function defaultScene(x,z) {
    return {
        things: [new Plane(new Vector(0.0, 1.0, 0.0), 0.0, Surfaces.checkerboard),
            new Sphere(new Vector(-1, 2, 0), 2, Surfaces.shinyRed),
            new Sphere(new Vector(0, 1, -5), 1, Surfaces.shinyWhite)],
        lights: [//{ pos: new Vector(-2.0, 10, 0.0), color: new Color(1,1,1) },
            //{ pos: new Vector(-1.5, 10, 1.5), color: new Color(1,1,1) },
            //{ pos: new Vector(1.5, 10, -1.5), color: new Color(1,1,1) },
            { pos: new Vector(0.0, 10, 0.0), color: new Color(1,1,1) }],
        camera: new Camera(new Vector(x, 5, z), new Vector(0,5,0))
    };
}

let canv=document.createElement('canvas')
canv.height=canv.width=128
canv.style='width:'+(canv.width*2)+'px;'+'height:'+(canv.height*2)+'px;'
document.body.appendChild(canv)
let ctx = canv.getContext('2d')
let rayTracer = new RayTracer()
let renderItNow=(x,z)=>rayTracer.render(defaultScene(x,z),ctx,canv.width,canv.height)
window.renderItNow=renderItNow
v=()=>10-parseFloat(2*(20-document.all.camera.value/3))
x=()=>Math.cos(v())*25
z=()=>Math.sin(v())*25
//document.all.camera.oninput=()=>renderItNow(x(),z())
//renderItNow(x(),z())
let r=()=>renderItNow(x(),z())
let t=()=>{r(); setTimeout(t,500)}
t()
