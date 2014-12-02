
// Geometric Toy - Fulla at Hackathon 2014 in Slovak National Gallery.
//
// Created by Zden Hlinka using outputs from his Geometric Photo Filter.
// (developing version to be released in near future allowing better geometric control)
// All images are based on paitings of Lubovit Fulla.
// Tearing Cloth by Sufflick was modified to create this small viewer capable
// to map vector images on cloth model. Thanks a lot for this amazing straightforward
// piece of physics modelling code.
//
// featuring fft distortion from microphone - type 'fulla' to activate
//
// --------------------------------------------------
// modified Tearing Cloth code

/*
Copyright (c) 2013 Suffick at Codepen (http://codepen.io/suffick) and GitHub (https://github.com/suffick)
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// settings

var physics_accuracy = 3,
    mouse_influence = 20,
    mouse_cut = 50,
    gravity = 1000,
    cloth_width = 48,
    cloth_height = 48,
    start_y = 20,
    spacing = 20,
    tear_distance = 500;


window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
};

var canvas,
    ctx,
    cloth,
    boundsx,
    boundsy,
    mouse = {
        down: false,
        button: 1,
        x: 0,
        y: 0,
        px: 0,
        py: 0
    };

var Point = function (x, y, grid_x, grid_y) {

	this.grid_x = grid_x;
	this.grid_y = grid_y;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = 0;
    this.vy = 0;
    this.pin_x = null;
    this.pin_y = null;

    this.constraints = [];
};

Point.prototype.update = function (delta) {

    if (mouse.down) {

        var diff_x = this.x - mouse.x,
            diff_y = this.y - mouse.y,
            dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

        if (mouse.button == 1) {

            if (dist < mouse_influence) {
                this.px = this.x - (mouse.x - mouse.px) * 1.8;
                this.py = this.y - (mouse.y - mouse.py) * 1.8;
            }

        } // (tearing removed) else if (dist < mouse_cut) this.constraints = [];
    }

    this.add_force(0, gravity);

    delta *= delta;
    nx = this.x + ((this.x - this.px) * .99) + ((this.vx / 2) * delta);
    ny = this.y + ((this.y - this.py) * .99) + ((this.vy / 2) * delta);

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0
};

Point.prototype.resolve_constraints = function () {

    if (this.pin_x != null && this.pin_y != null) {

        this.x = this.pin_x;
        this.y = this.pin_y;
        return;
    }

    var i = this.constraints.length;
    while (i--) this.constraints[i].resolve();
/*
// bounds removed

    if (this.x > boundsx) {

        this.x = 2 * boundsx - this.x;
        
    } else if (this.x < 1) {

        this.x = 2 - this.x;
    }

    if (this.y > boundsy) {

        this.y = 2 * boundsy - this.y;
        
    } else if (this.y < 1) {

        this.y = 2 - this.y;
    }
*/
};

Point.prototype.attach = function (point) {

    this.constraints.push(
        new Constraint(this, point)
    );
};

Point.prototype.remove_constraint = function (lnk) {

    var i = this.constraints.length;
    while (i--)
        if (this.constraints[i] == lnk) this.constraints.splice(i, 1);
};

Point.prototype.add_force = function (x, y) {

    this.vx += x;
    this.vy += y;
};

Point.prototype.pin = function (pinx, piny) {
    this.pin_x = pinx;
    this.pin_y = piny;
};

var Constraint = function (p1, p2) {

    this.p1 = p1;
    this.p2 = p2;
	var dx = p2.x - p1.x, dy = p2.y - p1.y;
    this.length = Math.sqrt(dx*dx + dy*dy);
};

Constraint.prototype.update = function () {

	var dx = this.p2.x - this.p1.x, dy = this.p2.y - this.p1.y;
    this.length = Math.sqrt(dx*dx + dy*dy);
};

Constraint.prototype.resolve = function () {

    var diff_x = this.p1.x - this.p2.x,
        diff_y = this.p1.y - this.p2.y,
        dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y),
        diff = (this.length - dist) / dist;

// (tearing removed)   if (dist > tear_distance) this.p1.remove_constraint(this);

    var px = diff_x * diff * 0.5;
    var py = diff_y * diff * 0.5;

    this.p1.x += px;
    this.p1.y += py;
    this.p2.x -= px;
    this.p2.y -= py;
};

var Cloth = function (x_res, y_res, can_wid, can_hei) {

    this.points = [];

	can_hei -= start_y + 80;
	var x, y, p, xp, yp;
	var rat = x_res / y_res;
	var wid_pix = can_hei * rat;
    var start_x = (can_wid - wid_pix) / 2;

	for (y = 0; y < cloth_height; y++)
	{
		for (x = 0; x < cloth_width; x++)
		{
			xp = start_x + (x * wid_pix) / (cloth_width);
			yp = start_y + (y * can_hei) / (cloth_height);
			p = new Point(xp, yp, x, y);

            x != 0 && p.attach(this.points[this.points.length - 1]);
            y == 0 && p.pin(p.x, p.y);
            y != 0 && p.attach(this.points[x + (y - 1) * (cloth_width)])

            this.points.push(p);
        }
    }
	check_art();
};

Cloth.prototype.rescale = function (x_res, y_res, can_wid, can_hei)
{
	can_hei -= start_y + 80;
	var x, y, p, xp, yp;
	var rat = x_res / y_res;
	var wid_pix = can_hei * rat;
    var start_x = (can_wid - wid_pix) / 2;

	var a, b, c = this.points.length, cc;
	for (a = 0; a < c; a++)
	{
			xp = start_x + (this.points[a].grid_x * wid_pix) / (cloth_width);
			yp = start_y + (this.points[a].grid_y * can_hei) / (cloth_height);
			this.points[a].x = this.points[a].px = xp;
			this.points[a].y = this.points[a].py = yp;
			this.points[a].vx = this.points[a].vy = 0;

			cc = this.points[a].constraints.length;
			for (b = 0; b < cc; b++)
				this.points[a].constraints[b].update();

			if (!this.points[a].grid_y)
				this.points[a].pin(xp, yp);
	}
	check_art();
};

Cloth.prototype.update = function () {

    var i = physics_accuracy;

    while (i--) {
        var p = this.points.length;
        while (p--) this.points[p].resolve_constraints();
    }

    i = this.points.length;
    while (i--) this.points[i].update(.016);
};

Cloth.prototype.draw = function () {

	paint_art(cloth.points);

};

function update() {
	rect(ctx, 0, 0, canvas.width, canvas.height, 1, "white", 0.5, 0);
//    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cloth.update();
    cloth.draw();

	if (fft && fft.init_done)
	{
	    fft.getFFT();
		var a, c = cloth.points.length;
	    for (a = 0; a < c; a++)
	    {
	    	cloth.points[a].px += (fft.dataArray[a & 127]-128)/12;
	    	cloth.points[a].py -= (fft.dataArray[(64+a) & 127]-128)/12;
	    }
	}

    requestAnimFrame(update);
}

function start() {

// added touch support
	canvas.ontouchstart = function (e) {
        mouse.button = 1;

        var rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left,
        mouse.y = e.touches[0].clientY - rect.top,
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        mouse.down = true;
        e.preventDefault();
	}
	
	canvas.ontouchend = function (e) {
        mouse.down = false;
        e.preventDefault();
	};
	
    canvas.ontouchmove = function (e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left,
        mouse.y = e.touches[0].clientY - rect.top,
        e.preventDefault();
    };

    canvas.onmousedown = function (e) {
        mouse.button = e.which;
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
        mouse.y = e.clientY - rect.top,
        mouse.down = true;
        e.preventDefault();
    };

    canvas.onmouseup = canvas.onmouseout = function (e) {
        mouse.down = false;
        e.preventDefault();
    };

    canvas.onmousemove = function (e) {
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left,
        mouse.y = e.clientY - rect.top,
        e.preventDefault();
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };

    boundsx = canvas.width - 1;
    boundsy = canvas.height - 1;

	gallery.num = artworks.length;	
	restart();
	update();
}

// ------------- vector image mapper on cloth model - V1.0 - (c) Zden Hlinka - 2014 - created at Hackacthon in Slovak National Gallery

var first = 1;

function restart()
{
	var i = artworks[gallery.pos][0];

	if (first)
		cloth = new Cloth(i.x_res, i.y_res, canvas.width, canvas.height);
	else
	{
		cloth.rescale(i.x_res, i.y_res, canvas.width, canvas.height);
	}

	first = 0;
}

window.onload = function () {

    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');

    canvas.width = 1200;
    canvas.height = 800;

    start();
};

/// ------------------------------------------------------------------------------------

function line(con_, xs, ys, xe, ye, col, alfa, stroke)
{
	con_.lineWidth = 1;
	con_.strokeStyle = col;
	con_.globalAlpha = alfa;
	con_.lineCap= "round";
	con_.beginPath();
	con_.moveTo(xs, ys);
	con_.lineTo(xe, ye);
	con_.stroke();
}

function rect(con_, x1, y1, wid, hei, filled, col, alfa, stroke)
{
	con_.lineWidth = stroke;
	con_.beginPath();
	con_.globalAlpha = alfa;

	con_.rect(x1, y1, wid, hei);

	if (filled)
	{
		con_.fillStyle = col;
		con_.fill(); 
	}
	else
	{
		con_.strokeStyle = col;
		con_.stroke();
	}
}

function triangle(con_, x1, y1, x2, y2, x3, y3, filled, col, alfa, stroke)
{
	con_.lineWidth = stroke;
	con_.beginPath();
	con_.moveTo(x1, y1);
	con_.lineTo(x2, y2);
	con_.lineTo(x3, y3);
	con_.lineTo(x1, y1);
	con_.globalAlpha = alfa;
	con_.closePath();
	
	if (filled)
	{
		con_.fillStyle = col;
		con_.fill();
	}
	else
	{
		con_.strokeStyle = col;
		con_.stroke();
	}
}

function circle(con_, x, y, r, filled, col, alfa, stroke)
{
	con_.lineWidth = stroke;
	con_.globalAlpha = alfa;
	con_.beginPath();
	con_.arc(x, y, r, 0, 2 * Math.PI, false);
	
	if (filled)
	{
		con_.fillStyle = col;
		con_.fill();
	}
	else
	{
		con_.globalAlpha = alfa;
		con_.strokeStyle = col;
		con_.stroke();
	}
}

function check_art()
{
	var art_in = artworks[gallery.pos];
	if (art_in[0].checked) return;

	var a, c = art_in.length, i;
	var x_res = art_in[0].x_res;
	var y_res = art_in[0].y_res;
	var wid = x_res/cloth_width;
	var hei = y_res/cloth_height;

	for (a = 1; a < c; a++)
	{
		i = art_in[a];
		switch (i.s)
		{
			case 'r':

			art_in[a].grid_x = Math.floor((i.x * cloth_width)/x_res);
			art_in[a].grid_y = Math.floor((i.y * cloth_height)/y_res);
			art_in[a].grid_offset_x = i.x - (art_in[a].grid_x * wid);
			art_in[a].grid_offset_y = i.y - (art_in[a].grid_y * hei);
			break;
			
			case 'c':
			
			art_in[a].grid_x = Math.floor((i.x * cloth_width)/x_res);
			art_in[a].grid_y = Math.floor((i.y * cloth_height)/y_res);
			art_in[a].grid_offset_x = i.x - (art_in[a].grid_x * wid);
			art_in[a].grid_offset_y = i.y - (art_in[a].grid_y * hei);
			break;
			
			case 'l':

			art_in[a].grid_x1 = Math.floor((i.x1 * cloth_width)/x_res);
			art_in[a].grid_y1 = Math.floor((i.y1 * cloth_height)/y_res);
			art_in[a].grid_offset_x1 = i.x1 - (art_in[a].grid_x1 * wid);
			art_in[a].grid_offset_y1 = i.y1 - (art_in[a].grid_y1 * hei);
			
			art_in[a].grid_x2 = Math.floor((i.x2 * cloth_width)/x_res);
			art_in[a].grid_y2 = Math.floor((i.y2 * cloth_height)/y_res);
			art_in[a].grid_offset_x2 = i.x2 - (art_in[a].grid_x2 * wid);
			art_in[a].grid_offset_y2 = i.y2 - (art_in[a].grid_y2 * hei);
			break;
			
			case 't':

			art_in[a].grid_x1 = Math.floor((i.x1 * cloth_width)/x_res);
			art_in[a].grid_y1 = Math.floor((i.y1 * cloth_height)/y_res);
			art_in[a].grid_offset_x1 = i.x1 - (art_in[a].grid_x1 * wid);
			art_in[a].grid_offset_y1 = i.y1 - (art_in[a].grid_y1 * hei);
			
			art_in[a].grid_x2 = Math.floor((i.x2 * cloth_width)/x_res);
			art_in[a].grid_y2 = Math.floor((i.y2 * cloth_height)/y_res);
			art_in[a].grid_offset_x2 = i.x2 - (art_in[a].grid_x2 * wid);
			art_in[a].grid_offset_y2 = i.y2 - (art_in[a].grid_y2 * hei);

			art_in[a].grid_x3 = Math.floor((i.x3 * cloth_width)/x_res);
			art_in[a].grid_y3 = Math.floor((i.y3 * cloth_height)/y_res);
			art_in[a].grid_offset_x3 = i.x3 - (art_in[a].grid_x3 * wid);
			art_in[a].grid_offset_y3 = i.y3 - (art_in[a].grid_y3 * hei);		
			break;
		}
	}
	art_in[0].checked = 1;
}

function paint_art(points) //x, y, grid_x, grid_y)
{
	var art = artworks[gallery.pos];
	var a, c = art.length, p;
	var x, y, i, x1, y1, x2, y2, x3, y3;

	for (a = 1; a < c; a++)
	{
		i = art[a];
		
		switch (i.s)
		{
			case 'r':
				p = (i.grid_y * (cloth_width)) + i.grid_x;
				x = points[p].x+i.grid_offset_x;
				y = points[p].y+i.grid_offset_y;

				rect(ctx, x+i.grid_offset_x, y+i.grid_offset_y, i.w, i.h, i.f, i.c, i.a, i.l);
				break;
				
			case 'c':
				p = (i.grid_y * (cloth_width)) + i.grid_x;
				x = points[p].x+i.grid_offset_x;
				y = points[p].y+i.grid_offset_y;

				circle(ctx, x+i.grid_offset_x, y+i.grid_offset_y, i.r, i.f, i.c, i.a, i.l);
				break;			
			
			case 'l':
				p = (i.grid_y1 * (cloth_width)) + i.grid_x1;
				x1 = points[p].x+i.grid_offset_x1;
				y1 = points[p].y+i.grid_offset_y1;
				p = (i.grid_y2 * (cloth_width)) + i.grid_x2;
				x2 = points[p].x+i.grid_offset_x2;
				y2 = points[p].y+i.grid_offset_y2;

				line(ctx, x1, y1, x2, y2, i.c, i.a, i.l);
				break;
			case 't':
				p = (i.grid_y1 * (cloth_width)) + i.grid_x1;
				x1 = points[p].x+i.grid_offset_x1;
				y1 = points[p].y+i.grid_offset_y1;
				p = (i.grid_y2 * (cloth_width)) + i.grid_x2;
				x2 = points[p].x+i.grid_offset_x2;
				y2 = points[p].y+i.grid_offset_y2;
				p = (i.grid_y3 * (cloth_width)) + i.grid_x3;
				x3 = points[p].x+i.grid_offset_x3;
				y3 = points[p].y+i.grid_offset_y3;

				triangle(ctx, x1, y1, x2, y2, x3, y3, i.f, i.c, i.a, i.l);
				break;
		}
	}
}

function go_left()
{
	gallery.pos--;
	if (gallery.pos < 0) gallery.pos = gallery.num - 1;
	restart();
}

function go_right()
{
	gallery.pos++;
	gallery.pos %= gallery.num;
	restart();
}

var fft = 0;

var egg_keys_pos = 0;
var egg_keys = [ 70, 85, 76, 76, 65 ];

function keydown(e)
{
	if (!e) e = event;

	switch(e.keyCode)
	{
		case 37: go_left(); break;
		case 39: go_right(); break;
		default:
			if (fft) break;
			if (egg_keys_pos < 5 && e.keyCode == egg_keys[egg_keys_pos])
				egg_keys_pos++;
			else
				egg_keys_pos = 0;
			if (egg_keys_pos == 5)
			{
				fft = new AudioFFT(128);
				fft.init(fft);
			}
			break;
	};
}
if (document.addEventListener) document.addEventListener("keydown",keydown,false); else if (document.attachEvent) document.attachEvent("onkeydown", keydown); else document.onkeydown= keydown;


var gallery = { pos: 0, num:0 };
var artworks = [ 
art_fulla_circ2, art_test, art_sqcool_full, art_fulla_line, art_fulla_sq2,
art_fulla_triangle, art_jezis4, art_jezis3, art_jezis2, art_jezis,
art_luka_cool, art_luka_cool2, art_luka_ciary2,  art_luka_ciary,
art_myface, art_nakoni, art_nakoni2, art_nakoni3,
art_pistalkar, art_postavi_l, art_postavi_ll, art_sq,
art_tety6, art_tety5, art_tety3, art_zena3,
art_zena2, art_zena, art_woman2, 
art_copana, art_dama2, art_dama3, art_dama1,
art_holazena, art_hory2, art_hory1, 
art_circles, art_fulla_circ,  art_test2, art_hrad5,
];

// easter egg audio stuff

var AudioFFT = function (fft_sizer)
{
	navigator.getUserMedia = (navigator.getUserMedia ||
    	                      navigator.webkitGetUserMedia ||
        	                  navigator.mozGetUserMedia ||
            	              navigator.msGetUserMedia) || 0;

	this.init_done = 0;
	if (!navigator.getUserMedia) { return; }
	this.init_done = 1;
	this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	this.analyser = this.audioCtx.createAnalyser();
	this.microphone;
	this.fft_size = this.analyser.fftSize = fft_sizer;
	this.dataArray = new Uint8Array(this.fft_size);
}

AudioFFT.prototype.init = function (a)
{
	if (navigator.getUserMedia)
		navigator.getUserMedia({video: false, audio: true},
		
		function(stream)
		{
			microphone = a.audioCtx.createMediaStreamSource(stream);
			microphone.connect(a.analyser);
		},
		
		function(s) { }
		
		);
};

AudioFFT.prototype.getFFT = function ()
{
	this.analyser.getByteTimeDomainData(this.dataArray);
}