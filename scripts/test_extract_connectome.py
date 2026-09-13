import unittest
from extract_connectome import assemble


class ExtractionTests(unittest.TestCase):
    def test_polyadic_sites_preserved_and_scaled(self):
        nodes = [{'bodyId': 12781}, {'bodyId': 556329}]
        pairs = [{'bodyId_pre': 12781, 'bodyId_post': 556329, 'weight': 2}]
        rows = [dict(bodyId_pre=12781, bodyId_post=556329, x_pre=1,y_pre=2,z_pre=3,
                     x_post=4,y_post=5,z_post=z, ach=.9, gaba=.1) for z in (6,7)]
        result = assemble(['12781','556329'], nodes, pairs, rows, ['ach','gaba'])
        edge = result['edges'][0]
        self.assertEqual(edge['contactsNm'][0], [8,16,24,32,40,48])
        self.assertEqual(edge['synapseCount'], 2)
        self.assertEqual(edge['transmitter'], 'ach')
        self.assertIsNone(result['nodes'][0]['rootId'])
        with self.assertRaises(ValueError):
            assemble(['12781','556329'], nodes, pairs, rows[:1], [])

    def test_empty_graph_is_not_filled_in(self):
        result = assemble(['12781'], [{'bodyId':12781}], [], [], [])
        self.assertEqual(result['edges'], [])
        self.assertEqual(result['report']['isolatedBodyIds'], ['12781'])

    def test_missing_body_fails(self):
        with self.assertRaises(ValueError):
            assemble(['12781'], [], [], [], [])


if __name__ == '__main__':
    unittest.main()
