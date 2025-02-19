import React from 'react';
import { Group } from '@vx/group';
import { GradientOrangeRed, GradientPinkRed } from '@vx/gradient';
import { RectClipPath } from '@vx/clip-path';
import { scaleLinear } from '@vx/scale';
import { localPoint } from '@vx/event';
import { voronoi, VoronoiPolygon } from '@vx/voronoi';

const neighborRadius = 75;

const extent = (data, value = d => d) => [
  Math.min(...data.map(value)),
  Math.max(...data.map(value))
];

const data = Array(200)
  .fill(null)
  .map(() => ({
    x: Math.random(),
    y: Math.random(),
    id: Math.random()
      .toString(36)
      .slice(2)
  }));

class VoronoiChart extends React.PureComponent {
  static getUpdatedState(props) {
    const { width, height, margin } = props;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = scaleLinear({
      domain: extent(data, d => d.x),
      range: [0, innerWidth]
    });

    const yScale = scaleLinear({
      domain: extent(data, d => d.y),
      range: [innerHeight, 0]
    });

    const voronoiDiagram = voronoi({
      x: d => xScale(d.x),
      y: d => yScale(d.y),
      width: innerWidth,
      height: innerHeight
    })(data);

    return {
      selected: null,
      selectedNeighbors: null,
      xScale,
      yScale,
      voronoiDiagram,
      innerWidth,
      innerHeight
    };
  }

  constructor(props) {
    super(props);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.state = VoronoiChart.getUpdatedState(props);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.width !== this.props.width || nextProps.height !== this.props.height) {
      this.setState(VoronoiChart.getUpdatedState(nextProps));
    }
  }

  handleMouseMove(event) {
    const { voronoiDiagram } = this.state;
    const { x, y } = localPoint(this.svg, event);
    const closest = voronoiDiagram.find(x, y, neighborRadius);
    if (closest) {
      const neighbors = {};
      const cell = voronoiDiagram.cells[closest.index];
      cell.halfedges.forEach(index => {
        const edge = voronoiDiagram.edges[index];
        const { left, right } = edge;
        if (left && left !== closest) neighbors[left.data.id] = true;
        else if (right && right !== closest) neighbors[right.data.id] = true;
      });
      this.setState({ selected: closest, neighbors });
    }
  }

  render() {
    const { width, height, margin } = this.props;

    const {
      voronoiDiagram,
      innerWidth,
      innerHeight,
      xScale,
      yScale,
      selected,
      neighbors
    } = this.state;

    const polygons = voronoiDiagram.polygons();

    return (
      <svg
        width={width}
        height={height}
        ref={ref => {
          this.svg = ref;
        }}
      >
        <GradientOrangeRed id="voronoi_orange_red" />
        <GradientPinkRed id="voronoi_pink_red" />
        <rect fill="url(#voronoi_pink_red)" width={innerWidth} height={innerHeight} rx={14} />
        <RectClipPath id="voronoi_clip" width={innerWidth} height={innerHeight} rx={14} />
        <Group
          top={margin.top}
          left={margin.left}
          clipPath="url(#voronoi_clip)"
          onMouseMove={this.handleMouseMove}
          onMouseLeave={() => {
            this.setState({ selected: null, neighbors: null });
          }}
        >
          {polygons.map(polygon => (
            <VoronoiPolygon
              key={`polygon-${polygon.data.id}`}
              polygon={polygon}
              stroke="#fff"
              strokeWidth={1}
              fill={
                selected && (polygon.data.id === selected.data.id || neighbors[polygon.data.id])
                  ? 'url(#voronoi_orange_red)'
                  : 'url(#voronoi_pink_red)'
              }
              fillOpacity={neighbors && neighbors[polygon.data.id] ? 0.4 : 1}
            />
          ))}
          {data.map(d => (
            <circle
              key={`circle-${d.id}`}
              r={2}
              cx={xScale(d.x)}
              cy={yScale(d.y)}
              fill="#ffffff"
              fillOpacity={0.5}
            />
          ))}
        </Group>
      </svg>
    );
  }
}

export default ({ width, height, margin, events }) => (
  <VoronoiChart width={width} height={height} events={events} margin={margin} />
);
