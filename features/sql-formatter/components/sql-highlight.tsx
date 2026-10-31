export function SqlHighlight({ sql }: { sql: string }) {
  const tokenRegex =
    /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b(?:WITH|SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END|AS|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|DELETE|CREATE\s+TABLE|CREATE\s+VIEW|CREATE\s+INDEX|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+VIEW|DROP\s+INDEX|TRUNCATE\s+TABLE|UNION\s+ALL|UNION|EXCEPT|INTERSECT|RETURNING|DISTINCT|ASC|DESC|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CASCADE|DEFAULT|CHECK|UNIQUE|CONSTRAINT|OVER|PARTITION\s+BY|WINDOW|FETCH\s+FIRST|FETCH\s+NEXT)\b|\b(?:COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|CONCAT|NOW|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD)\b(?=\s*\())/gi;

  const parts = sql.split(tokenRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("--") || part.startsWith("/*")) {
      return (
        <span key={i} className="syntax-comment">
          {part}
        </span>
      );
    }
    if (part.startsWith("'")) {
      return (
        <span key={i} className="syntax-string">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={i} className="syntax-number">
          {part}
        </span>
      );
    }
    if (
      /^(COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|CONCAT|NOW|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD)$/i.test(
        part
      )
    ) {
      return (
        <span key={i} className="syntax-fn">
          {part}
        </span>
      );
    }
    if (
      /^(WITH|SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|NATURAL\s+JOIN|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END|AS|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM|DELETE|CREATE\s+TABLE|CREATE\s+VIEW|CREATE\s+INDEX|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+VIEW|DROP\s+INDEX|TRUNCATE\s+TABLE|UNION\s+ALL|UNION|EXCEPT|INTERSECT|RETURNING|DISTINCT|ASC|DESC|PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|CASCADE|DEFAULT|CHECK|UNIQUE|CONSTRAINT|OVER|PARTITION\s+BY|WINDOW|FETCH\s+FIRST|FETCH\s+NEXT)$/i.test(
        part
      )
    ) {
      return (
        <span key={i} className="syntax-keyword">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
